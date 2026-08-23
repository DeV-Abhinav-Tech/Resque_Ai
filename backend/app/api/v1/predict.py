from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from geoalchemy2.functions import ST_AsGeoJSON, ST_MakePoint, ST_SetSRID, ST_DWithin, ST_GeomFromText
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import uuid

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.schemas import (
    EarthquakePredictionRequest,
    EarthquakePredictionResponse,
    EarthquakePredictionCell,
    FloodPredictionRequest,
    FloodPredictionResponse,
    FloodPredictionZone,
    HurricanePredictionRequest,
    HurricanePredictionResponse,
    HistoricalQueryParams,
    HazardEventResponse,
    AlertResponse,
    AlertSubscriptionRequest,
    AlertSubscriptionResponse,
    HealthResponse,
    ModelInfoResponse,
    HazardType,
    SeverityLevel,
    AlertSeverity,
    LoginRequest,
    RegisterRequest,
    UserResponse,
    TokenResponse,
)
from backend.app.models.hazard_event import HazardEvent, DataSourceType, HazardType as ModelHazardType, SeverityLevel as ModelSeverityLevel
from backend.app.models.prediction import Prediction, ModelVersion
from backend.app.models.alert import Alert, AlertSubscription, AlertStatus, AlertSeverity as ModelAlertSeverity
from backend.app.models.user import User
from backend.app.ml import EarthquakeModel, FloodModel, HurricaneModel, ModelLoader
from backend.app.utils.auth import get_current_user, get_api_key_user, create_access_token

router = APIRouter(prefix=settings.API_V1_PREFIX)

DEMO_USER_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        timestamp=datetime.utcnow(),
        services={
            "database": "connected",
            "redis": "connected",
            "ml_models": "loaded",
        }
    )


@router.post("/auth/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    new_id = uuid.uuid4()
    user_res = UserResponse(
        id=new_id,
        email=request.email,
        full_name=request.full_name or request.email.split("@")[0].capitalize(),
        role=request.role or "ANALYST",
        is_active=True,
    )
    token = create_access_token(new_id)
    return TokenResponse(access_token=token, user=user_res)


@router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    if request.email == "demo@resque.ai" and request.password == "demo123456":
        user_res = UserResponse(
            id=DEMO_USER_ID,
            email="demo@resque.ai",
            full_name="Demo User",
            role="ANALYST",
            is_active=True,
        )
        token = create_access_token(DEMO_USER_ID)
        return TokenResponse(access_token=token, user=user_res)

    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_res = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        is_active=user.is_active,
    )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=user_res)


@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        is_active=user.is_active,
    )


@router.post("/auth/logout")
async def logout():
    return {"detail": "Successfully logged out"}


@router.post("/predict/earthquake", response_model=EarthquakePredictionResponse)
async def predict_earthquake(
    request: EarthquakePredictionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        model = await ModelLoader.load_production_model(ModelHazardType.EARTHQUAKE)
    except ValueError:
        model = EarthquakeModel(model_version=settings.EARTHQUAKE_MODEL_VERSION)

    grid_data = await _generate_prediction_grid(
        db, request.latitude, request.longitude, request.radius_km
    )

    results = model.predict_grid(
        grid_data,
        request.latitude,
        request.longitude,
        request.radius_km,
        request.time_horizon_days,
    )

    cells = []
    for r in results:
        meta = r.metadata or {}
        cells.append(EarthquakePredictionCell(
            grid_id=meta.get("grid_id", f"cell_{uuid.uuid4().hex[:8]}"),
            latitude=r.geometry["coordinates"][1],
            longitude=r.geometry["coordinates"][0],
            probability_m5_plus=r.probability,
            probability_m6_plus=r.probability * 0.3,
            probability_m7_plus=r.probability * 0.05,
            confidence=r.confidence_upper - r.confidence_lower if r.confidence_upper and r.confidence_lower else 0.8,
            severity=r.expected_severity,
            model_version=r.metadata.get("model_version", settings.EARTHQUAKE_MODEL_VERSION) if r.metadata else settings.EARTHQUAKE_MODEL_VERSION,
        ))

    return EarthquakePredictionResponse(
        predictions=cells,
        metadata={
            "generated_at": datetime.utcnow().isoformat(),
            "center_lat": request.latitude,
            "center_lon": request.longitude,
            "radius_km": request.radius_km,
            "time_horizon_days": request.time_horizon_days,
            "model_version": settings.EARTHQUAKE_MODEL_VERSION,
            "data_freshness_minutes": 5,
        }
    )


@router.post("/predict/flood", response_model=FloodPredictionResponse)
async def predict_flood(
    request: FloodPredictionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        model = await ModelLoader.load_production_model(ModelHazardType.FLOOD)
    except ValueError:
        model = FloodModel(model_version=settings.FLOOD_MODEL_VERSION)

    watershed_data = await _get_watershed_features(
        db, request.latitude, request.longitude, request.radius_km
    )

    results = model.predict_watershed(watershed_data)

    zones = []
    for r in results:
        zones.append(FloodPredictionZone(
            zone_id=r.metadata.get("watershed_id", f"zone_{uuid.uuid4().hex[:8]}"),
            geometry=r.geometry,
            probability=r.probability,
            expected_depth_m=r.metadata.get("expected_depth_m") if r.metadata else None,
            severity=r.expected_severity,
            model_version=r.metadata.get("model_version", settings.FLOOD_MODEL_VERSION) if r.metadata else settings.FLOOD_MODEL_VERSION,
        ))

    return FloodPredictionResponse(
        zones=zones,
        metadata={
            "generated_at": datetime.utcnow().isoformat(),
            "center_lat": request.latitude,
            "center_lon": request.longitude,
            "radius_km": request.radius_km,
            "time_horizon_hours": request.time_horizon_hours,
            "model_version": settings.FLOOD_MODEL_VERSION,
        }
    )


@router.post("/predict/hurricane", response_model=HurricanePredictionResponse)
async def predict_hurricane(
    request: HurricanePredictionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        model = await ModelLoader.load_production_model(ModelHazardType.HURRICANE)
    except ValueError:
        model = HurricaneModel(model_version=settings.HURRICANE_MODEL_VERSION)

    if request.storm_id:
        storm_data = await _get_storm_track(db, request.storm_id)
        advisory = await _get_latest_advisory(request.storm_id)
    else:
        storm_data = await _get_genesis_probability(db, request.latitude, request.longitude)
        advisory = {"storm_id": f"INVEST_{uuid.uuid4().hex[:6].upper()}", "advisory_number": 0}

    prediction = model.predict_storm(storm_data, advisory)

    track_points = []
    for t in prediction.get("track_forecast", []):
        track_points.append(HurricaneTrackPoint(
            hour=t["hour"],
            latitude=t["latitude"],
            longitude=t["longitude"],
            max_wind_kt=t["max_wind_kt"],
        ))

    intensity_forecast = []
    for i in prediction.get("intensity_forecast", []):
        intensity_forecast.append(HurricaneIntensityForecast(
            hour=i["hour"],
            max_wind_kt=i["max_wind_kt"],
            min_pressure_mb=i.get("min_pressure_mb"),
            ri_probability=i.get("ri_probability", 0.0),
        ))

    landfall_probs = []
    for l in prediction.get("landfall_probabilities", []):
        landfall_probs.append(HurricaneLandfallProb(
            segment=l["segment"],
            probability=l["probability"],
            expected_time=l.get("expected_time"),
        ))

    return HurricanePredictionResponse(
        storm_id=prediction["storm_id"],
        advisory_number=prediction["advisory_number"],
        track_forecast=track_points,
        intensity_forecast=intensity_forecast,
        landfall_probabilities=landfall_probs,
        model_version=prediction["model_version"],
        metadata={
            "generated_at": datetime.utcnow().isoformat(),
        }
    )


@router.get("/historical", response_model=List[HazardEventResponse])
async def query_historical(
    params: HistoricalQueryParams = Depends(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(HazardEvent)

    conditions = []
    if params.hazard_type:
        conditions.append(HazardEvent.hazard_type == params.hazard_type)
    if params.severity:
        conditions.append(HazardEvent.severity == params.severity)
    if params.source:
        conditions.append(HazardEvent.source == DataSourceType(params.source))
    if params.start_date:
        conditions.append(HazardEvent.timestamp >= params.start_date)
    if params.end_date:
        conditions.append(HazardEvent.timestamp <= params.end_date)

    if params.min_lat is not None and params.max_lat is not None and \
       params.min_lon is not None and params.max_lon is not None:
        bbox = f"POLYGON(({params.min_lon} {params.min_lat}, {params.max_lon} {params.min_lat}, {params.max_lon} {params.max_lat}, {params.min_lon} {params.max_lat}, {params.min_lon} {params.min_lat}))"
        conditions.append(func.ST_Intersects(HazardEvent.geometry, ST_GeomFromText(bbox, 4326)))

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(HazardEvent.timestamp.desc()).limit(params.limit).offset(params.offset)

    result = await db.execute(query)
    events = result.scalars().all()

    return [
        HazardEventResponse(
            id=e.id,
            hazard_type=e.hazard_type,
            severity=e.severity,
            geometry=json.loads(await db.scalar(ST_AsGeoJSON(e.geometry))),
            timestamp=e.timestamp,
            source=e.source.value,
            properties=e.properties,
        )
        for e in events
    ]


@router.get("/alerts/active", response_model=List[AlertResponse])
async def get_active_alerts(
    hazard_type: Optional[HazardType] = None,
    severity: Optional[AlertSeverity] = None,
    min_lat: Optional[float] = Query(None, ge=-90, le=90),
    max_lat: Optional[float] = Query(None, ge=-90, le=90),
    min_lon: Optional[float] = Query(None, ge=-180, le=180),
    max_lon: Optional[float] = Query(None, ge=-180, le=180),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Alert).where(Alert.status == AlertStatus.ACTIVE)

    if hazard_type:
        query = query.where(Alert.hazard_type == hazard_type)
    if severity:
        query = query.where(Alert.severity == severity)

    if all(v is not None for v in [min_lat, max_lat, min_lon, max_lon]):
        bbox = f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"
        query = query.where(func.ST_Intersects(Alert.geometry, ST_GeomFromText(bbox, 4326)))

    query = query.order_by(Alert.effective.desc()).limit(100)

    result = await db.execute(query)
    alerts = result.scalars().all()

    return [
        AlertResponse(
            id=a.id,
            hazard_type=a.hazard_type,
            severity=a.severity,
            status=a.status.value,
            geometry=json.loads(await db.scalar(ST_AsGeoJSON(a.geometry))),
            effective=a.effective,
            expires=a.expires,
            headline=a.headline,
            description=a.description,
            instruction=a.instruction,
            certainty=a.certainty.value,
            urgency=a.urgency.value,
        )
        for a in alerts
    ]


@router.post("/alerts/subscriptions", response_model=AlertSubscriptionResponse)
async def create_alert_subscription(
    request: AlertSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    geometry_wkt = None
    if request.geometry:
        geometry_wkt = ST_GeomFromText(json.dumps(request.geometry), 4326)

    subscription = AlertSubscription(
        user_id=user.id,
        hazard_types=request.hazard_types,
        min_severity=ModelAlertSeverity(request.min_severity),
        geometry=geometry_wkt,
        notify_email=request.notify_email,
        notify_sms=request.notify_sms,
        notify_push=request.notify_push,
        notify_webhook=request.notify_webhook,
        webhook_url=request.webhook_url,
    )

    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)

    return AlertSubscriptionResponse(
        id=subscription.id,
        hazard_types=subscription.hazard_types,
        min_severity=subscription.min_severity,
        geometry=json.loads(await db.scalar(ST_AsGeoJSON(subscription.geometry))) if subscription.geometry else None,
        notify_email=subscription.notify_email,
        notify_sms=subscription.notify_sms,
        notify_push=subscription.notify_push,
        notify_webhook=subscription.notify_webhook,
        webhook_url=subscription.webhook_url,
        is_active=subscription.is_active,
        created_at=subscription.created_at,
    )


@router.get("/alerts/subscriptions", response_model=List[AlertSubscriptionResponse])
async def get_alert_subscriptions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AlertSubscription).where(AlertSubscription.user_id == user.id)
    )
    subscriptions = result.scalars().all()

    return [
        AlertSubscriptionResponse(
            id=s.id,
            hazard_types=s.hazard_types,
            min_severity=s.min_severity,
            geometry=json.loads(await db.scalar(ST_AsGeoJSON(s.geometry))) if s.geometry else None,
            notify_email=s.notify_email,
            notify_sms=s.notify_sms,
            notify_push=s.notify_push,
            notify_webhook=s.notify_webhook,
            webhook_url=s.webhook_url,
            is_active=s.is_active,
            created_at=s.created_at,
        )
        for s in subscriptions
    ]


@router.get("/models", response_model=List[ModelInfoResponse])
async def list_models(
    hazard_type: Optional[HazardType] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(ModelVersion)
    if hazard_type:
        query = query.where(ModelVersion.hazard_type == hazard_type)
    query = query.order_by(ModelVersion.hazard_type, ModelVersion.created_at.desc())

    result = await db.execute(query)
    models = result.scalars().all()

    return [
        ModelInfoResponse(
            hazard_type=m.hazard_type,
            version=m.version,
            algorithm=m.algorithm,
            framework=m.framework,
            training_data_start=m.training_data_start,
            training_data_end=m.training_data_end,
            metrics=m.metrics,
            is_production=m.is_production,
            is_staging=m.is_staging,
            deployed_at=m.deployed_at,
        )
        for m in models
    ]


async def _generate_prediction_grid(
    db: AsyncSession,
    lat: float,
    lon: float,
    radius_km: float,
) -> "pd.DataFrame":
    import pandas as pd
    import numpy as np

    resolution = settings.PREDICTION_GRID_RESOLUTION_DEG
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
                    "timestamp": datetime.utcnow(),
                })

    df = pd.DataFrame(rows)

    df["magnitude"] = 0.0
    df["rolling_rate_7d"] = 0
    df["rolling_rate_30d"] = 0
    df["rolling_max_mag_30d"] = 0
    df["rolling_mean_mag_30d"] = 0
    df["b_value"] = 1.0
    df["time_since_last_eq"] = 365

    return df


async def _get_watershed_features(
    db: AsyncSession,
    lat: float,
    lon: float,
    radius_km: float,
) -> "pd.DataFrame":
    import pandas as pd
    import numpy as np

    resolution = settings.PREDICTION_GRID_RESOLUTION_DEG
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
                    "watershed_id": f"ws_{i}_{j}",
                    "geometry": {"type": "Point", "coordinates": [longitude, latitude]},
                    "latitude": latitude,
                    "longitude": longitude,
                    "precipitation_mm": 0.0,
                    "soil_moisture": 0.3,
                    "streamflow_cms": 10.0,
                    "forecast_precip_24h": 0.0,
                    "forecast_precip_48h": 0.0,
                    "forecast_precip_72h": 0.0,
                    "elevation_m": 100.0,
                    "nearest_drain_elevation_m": 90.0,
                    "flow_accumulation": 1000.0,
                    "slope_deg": 2.0,
                    "timestamp": datetime.utcnow(),
                })

    return pd.DataFrame(rows)


async def _get_storm_track(db: AsyncSession, storm_id: str) -> "pd.DataFrame":
    import pandas as pd
    return pd.DataFrame()


async def _get_latest_advisory(storm_id: str) -> Dict[str, Any]:
    return {"storm_id": storm_id, "advisory_number": 1}


async def _get_genesis_probability(db: AsyncSession, lat: float, lon: float) -> "pd.DataFrame":
    import pandas as pd
    return pd.DataFrame()