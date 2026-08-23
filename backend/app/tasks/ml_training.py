from celery import shared_task
from datetime import datetime, timedelta
import structlog

logger = structlog.get_logger()


@shared_task(bind=True, max_retries=1)
def generate_predictions(self):
    import asyncio
    from backend.app.database import AsyncSessionLocal
    from backend.app.models.hazard_event import HazardEvent, HazardType as ModelHazardType
    from backend.app.models.prediction import Prediction
    from backend.app.ml import EarthquakeModel, FloodModel, HurricaneModel
    from backend.app.config import settings
    from sqlalchemy import select, func
    import pandas as pd
    import numpy as np
    import uuid

    async def _generate():
        async with AsyncSessionLocal() as db:
            eq_model = EarthquakeModel(model_version=settings.EARTHQUAKE_MODEL_VERSION)
            flood_model = FloodModel(model_version=settings.FLOOD_MODEL_VERSION)
            hurricane_model = HurricaneModel(model_version=settings.HURRICANE_MODEL_VERSION)

            for hazard_type, model in [
                (ModelHazardType.EARTHQUAKE, eq_model),
                (ModelHazardType.FLOOD, flood_model),
                (ModelHazardType.HURRICANE, hurricane_model),
            ]:
                try:
                    if not model.is_trained:
                        await _train_model(model, hazard_type, db)

                    await _generate_grid_predictions(model, hazard_type, db)
                except Exception as e:
                    logger.error(f"Prediction generation failed for {hazard_type}", error=str(e))

    try:
        asyncio.run(_generate())
        logger.info("Prediction generation completed")
        return {"status": "success"}
    except Exception as e:
        logger.error("Prediction generation failed", error=str(e))
        raise self.retry(exc=e)


async def _train_model(model, hazard_type, db):
    from backend.app.ml.earthquake import EarthquakeModel
    from backend.app.ml.flood import FloodModel
    from backend.app.ml.hurricane import HurricaneModel

    query = select(HazardEvent).where(HazardEvent.hazard_type == hazard_type).order_by(HazardEvent.timestamp).limit(100000)
    result = await db.execute(query)
    events = result.scalars().all()

    if len(events) < 1000:
        logger.warning(f"Insufficient data for {hazard_type}, skipping training")
        return

    df = pd.DataFrame([{
        "latitude": e.geometry.y if e.geometry else 0,
        "longitude": e.geometry.x if e.geometry else 0,
        "timestamp": e.timestamp,
        "magnitude": e.properties.get("magnitude", 0),
        "depth_km": e.properties.get("depth_km", 0),
    } for e in events])

    if isinstance(model, EarthquakeModel):
        df = model.prepare_features(df)
        for mag_thresh in [5.0]:
            for horizon in [7, 30]:
                target_col = f"target_m{mag_thresh}_{horizon}d"
                if target_col in df.columns:
                    features = [c for c in df.columns if not c.startswith("target_")]
                    metrics = model.train(df[features], df[target_col])
                    logger.info(f"Trained {hazard_type} model", target=target_col, metrics=metrics)
                    break

    elif isinstance(model, FloodModel):
        df = model.prepare_features(df)
        if "target_inundation" in df.columns:
            features = [c for c in df.columns if not c.startswith("target_")]
            metrics = model.train(df[features], df["target_inundation"])
            logger.info(f"Trained {hazard_type} model", metrics=metrics)

    elif isinstance(model, HurricaneModel):
        df = model.prepare_features(df)
        logger.info(f"Prepared {hazard_type} features", n_samples=len(df), n_features=len(model.feature_names))


async def _generate_grid_predictions(model, hazard_type, db):
    from backend.app.config import settings

    center_lats = [39.8283, 34.0522, 40.7128, 29.7604, 41.8781]
    center_lons = [-98.5795, -118.2437, -74.0060, -95.3698, -87.6298]

    for lat, lon in zip(center_lats, center_lons):
        grid_data = await _create_prediction_grid(lat, lon, 200)
        if len(grid_data) == 0:
            continue

        if isinstance(model, EarthquakeModel):
            results = model.predict_grid(grid_data, lat, lon, 200, 7)
            for r in results:
                pred = Prediction(
                    id=uuid.uuid4(),
                    hazard_type=hazard_type,
                    model_version=model.model_version,
                    geometry=r.geometry,
                    valid_time_start=datetime.utcnow(),
                    valid_time_end=datetime.utcnow() + timedelta(days=7),
                    probability=r.probability,
                    expected_severity=r.expected_severity,
                    confidence_lower=r.confidence_lower,
                    confidence_upper=r.confidence_upper,
                    feature_importance=r.feature_importance or {},
                    metadata=r.metadata or {},
                )
                db.add(pred)

        elif isinstance(model, FloodModel):
            results = model.predict_watershed(grid_data)
            for r in results:
                pred = Prediction(
                    id=uuid.uuid4(),
                    hazard_type=hazard_type,
                    model_version=model.model_version,
                    geometry=r.geometry,
                    valid_time_start=datetime.utcnow(),
                    valid_time_end=datetime.utcnow() + timedelta(hours=48),
                    probability=r.probability,
                    expected_severity=r.expected_severity,
                    confidence_lower=r.confidence_lower,
                    confidence_upper=r.confidence_upper,
                    feature_importance=r.feature_importance or {},
                    metadata=r.metadata or {},
                )
                db.add(pred)

    await db.commit()


async def _create_prediction_grid(lat: float, lon: float, radius_km: float):
    import pandas as pd
    import numpy as np

    resolution = 0.1
    km_per_deg = 111
    deg_radius = radius_km / km_per_deg

    lats = np.arange(lat - deg_radius, lat + deg_radius, resolution)
    lons = np.arange(lon - deg_radius, lon + deg_radius, resolution)

    rows = []
    for i, latitude in enumerate(lats):
        for j, longitude in enumerate(lons):
            dist = np.sqrt((latitude - lat)**2 + (longitude - lon)**2) * km_per_deg
            if dist <= radius_km:
                rows.append({
                    "grid_id": f"grid_{i}_{j}",
                    "latitude": latitude,
                    "longitude": longitude,
                    "dist_km": dist,
                    "geometry": {"type": "Point", "coordinates": [longitude, latitude]},
                })

    return pd.DataFrame(rows)


@shared_task(bind=True, max_retries=1)
def retrain_all_models(self):
    import asyncio
    from backend.app.database import AsyncSessionLocal
    from backend.app.models.hazard_event import HazardEvent, HazardType as ModelHazardType
    from backend.app.ml import EarthquakeModel, FloodModel, HurricaneModel
    from backend.app.config import settings
    from sqlalchemy import select
    import pandas as pd
    import uuid

    async def _retrain():
        async with AsyncSessionLocal() as db:
            for hazard_type, model_class, model_version in [
                (ModelHazardType.EARTHQUAKE, EarthquakeModel, settings.EARTHQUAKE_MODEL_VERSION),
                (ModelHazardType.FLOOD, FloodModel, settings.FLOOD_MODEL_VERSION),
                (ModelHazardType.HURRICANE, HurricaneModel, settings.HURRICANE_MODEL_VERSION),
            ]:
                try:
                    model = model_class(model_version=model_version)
                    query = select(HazardEvent).where(HazardEvent.hazard_type == hazard_type).order_by(HazardEvent.timestamp).limit(100000)
                    result = await db.execute(query)
                    events = result.scalars().all()

                    if len(events) < 1000:
                        continue

                    df = pd.DataFrame([{
                        "latitude": e.geometry.y if e.geometry else 0,
                        "longitude": e.geometry.x if e.geometry else 0,
                        "timestamp": e.timestamp,
                        "magnitude": e.properties.get("magnitude", 0),
                        "depth_km": e.properties.get("depth_km", 0),
                        "precipitation_mm": e.properties.get("precipitation_mm", 0),
                        "soil_moisture": e.properties.get("soil_moisture", 0.3),
                        "streamflow_cms": e.properties.get("streamflow_cms", 10),
                        "forecast_precip_24h": 0,
                        "forecast_precip_48h": 0,
                        "forecast_precip_72h": 0,
                        "elevation_m": 100,
                        "nearest_drain_elevation_m": 90,
                        "flow_accumulation": 1000,
                        "slope_deg": 2,
                    } for e in events])

                    df = model.prepare_features(df)

                    if isinstance(model, EarthquakeModel):
                        for mag_thresh in [5.0]:
                            for horizon in [7, 30]:
                                target_col = f"target_m{mag_thresh}_{horizon}d"
                                if target_col in df.columns:
                                    features = [c for c in df.columns if not c.startswith("target_")]
                                    model.train(df[features], df[target_col])
                                    break

                    elif isinstance(model, FloodModel):
                        if "target_inundation" in df.columns:
                            features = [c for c in df.columns if not c.startswith("target_")]
                            model.train(df[features], df["target_inundation"])

                    model.save(f"/app/models/{hazard_type.value}_{model_version}.joblib")
                    logger.info(f"Retrained and saved {hazard_type} model")

                except Exception as e:
                    logger.error(f"Retraining failed for {hazard_type}", error=str(e))

    try:
        asyncio.run(_retrain())
        logger.info("Model retraining completed")
        return {"status": "success"}
    except Exception as e:
        logger.error("Model retraining failed", error=str(e))
        raise self.retry(exc=e)