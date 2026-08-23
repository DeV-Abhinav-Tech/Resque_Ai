from celery import shared_task
from datetime import datetime, timedelta
import structlog
import json
import uuid

logger = structlog.get_logger()


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def check_and_generate_alerts(self):
    import asyncio
    from backend.app.database import AsyncSessionLocal
    from backend.app.models.prediction import Prediction
    from backend.app.models.alert import Alert, AlertStatus, AlertSeverity, AlertCertainty, AlertUrgency
    from backend.app.models.hazard_event import HazardType
    from backend.app.config import settings
    from sqlalchemy import select, and_
    from geoalchemy2.functions import ST_AsGeoJSON, ST_Union, ST_Buffer

    async def _check():
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()

            eq_predictions = await db.execute(
                select(Prediction)
                .where(Prediction.hazard_type == HazardType.EARTHQUAKE)
                .where(Prediction.valid_time_start <= now)
                .where(Prediction.valid_time_end >= now)
                .where(Prediction.probability >= settings.EQ_WATCH_PROBABILITY)
                .order_by(Prediction.probability.desc())
                .limit(100)
            )
            eq_preds = eq_predictions.scalars().all()

            for pred in eq_preds:
                await _create_or_update_alert(db, pred, settings)

            flood_predictions = await db.execute(
                select(Prediction)
                .where(Prediction.hazard_type == HazardType.FLOOD)
                .where(Prediction.valid_time_start <= now)
                .where(Prediction.valid_time_end >= now)
                .where(Prediction.probability >= settings.FLOOD_WATCH_PROBABILITY)
                .order_by(Prediction.probability.desc())
                .limit(100)
            )
            flood_preds = flood_predictions.scalars().all()

            for pred in flood_preds:
                await _create_or_update_alert(db, pred, settings)

            await db.commit()

    try:
        asyncio.run(_check())
        logger.info("Alert check completed")
        return {"status": "success"}
    except Exception as e:
        logger.error("Alert check failed", error=str(e))
        raise self.retry(exc=e)


async def _create_or_update_alert(db, prediction, settings):
    from backend.app.models.alert import Alert, AlertStatus, AlertSeverity, AlertCertainty, AlertUrgency
    from backend.app.models.hazard_event import HazardType
    from sqlalchemy import select, and_
    from geoalchemy2.functions import ST_AsGeoJSON, ST_Buffer

    existing = await db.execute(
        select(Alert)
        .where(Alert.hazard_type == prediction.hazard_type)
        .where(Alert.status == AlertStatus.ACTIVE)
        .where(Alert.source_predictions.contains([prediction.id]))
    )
    alert = existing.scalar_one_or_none()

    if prediction.hazard_type == HazardType.EARTHQUAKE:
        if prediction.probability >= settings.EQ_WARNING_PROBABILITY:
            severity = AlertSeverity.WARNING
        else:
            severity = AlertSeverity.WATCH
    elif prediction.hazard_type == HazardType.FLOOD:
        if prediction.probability >= settings.FLOOD_WARNING_PROBABILITY:
            severity = AlertSeverity.WARNING
        else:
            severity = AlertSeverity.WATCH
    else:
        severity = AlertSeverity.WATCH

    if alert:
        alert.severity = severity
        alert.expires = prediction.valid_time_end
        alert.updated_at = datetime.utcnow()
        alert.source_predictions = list(set(alert.source_predictions + [str(prediction.id)]))
    else:
        from geoalchemy2.shape import to_shape
        geom = to_shape(prediction.geometry)
        buffered = geom.buffer(0.1)

        alert = Alert(
            id=uuid.uuid4(),
            hazard_type=prediction.hazard_type,
            severity=severity,
            status=AlertStatus.ACTIVE,
            certainty=AlertCertainty.LIKELY,
            urgency=AlertUrgency.EXPECTED,
            geometry=buffered,
            effective=datetime.utcnow(),
            expires=prediction.valid_time_end,
            headline=_generate_headline(prediction),
            description=_generate_description(prediction),
            instruction=_generate_instruction(prediction),
            source_predictions=[str(prediction.id)],
            cap_event=_get_cap_event(prediction.hazard_type),
            cap_category="Geo",
            cap_response_type=_get_response_type(severity),
        )
        db.add(alert)

    logger.info("Alert created/updated", alert_id=str(alert.id), severity=severity.value)


def _generate_headline(prediction) -> str:
    hazard_names = {
        "EARTHQUAKE": "Earthquake",
        "FLOOD": "Flood",
        "HURRICANE": "Hurricane",
    }
    hazard = hazard_names.get(prediction.hazard_type.value, "Hazard")
    return f"{hazard} {prediction.expected_severity} Alert: {prediction.probability:.0%} Probability"


def _generate_description(prediction) -> str:
    return f"Model {prediction.model_version} predicts {prediction.probability:.1%} probability of {prediction.hazard_type.value.lower()} in the affected area."


def _generate_instruction(prediction) -> str:
    if prediction.expected_severity in ["CRITICAL", "HIGH"]:
        return "Take immediate protective action. Follow local emergency management guidance."
    else:
        return "Monitor conditions and stay informed. Prepare for possible worsening conditions."


def _get_cap_event(hazard_type) -> str:
    mapping = {
        HazardType.EARTHQUAKE: "Earthquake",
        HazardType.FLOOD: "Flood",
        HazardType.HURRICANE: "Tropical Cyclone",
    }
    return mapping.get(hazard_type, "Hazard")


def _get_response_type(severity) -> str:
    mapping = {
        AlertSeverity.WATCH: "Monitor",
        AlertSeverity.WARNING: "Shelter",
        AlertSeverity.EMERGENCY: "Evacuate",
    }
    return mapping.get(severity, "Monitor")