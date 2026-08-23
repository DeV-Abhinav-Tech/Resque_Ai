from celery import Celery
from backend.app.config import settings

celery_app = Celery(
    "resque",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "backend.app.tasks.ingestion",
        "backend.app.tasks.ml_training",
        "backend.app.tasks.alerts",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    worker_prefetch_multiplier=4,
    beat_schedule={
        "ingest-realtime-every-5-min": {
            "task": "backend.app.tasks.ingestion.ingest_realtime",
            "schedule": 300.0,
        },
        "generate-predictions-hourly": {
            "task": "backend.app.tasks.ml_training.generate_predictions",
            "schedule": 3600.0,
        },
        "check-alerts-every-minute": {
            "task": "backend.app.tasks.alerts.check_and_generate_alerts",
            "schedule": 60.0,
        },
        "retrain-models-weekly": {
            "task": "backend.app.tasks.ml_training.retrain_all_models",
            "schedule": 604800.0,
        },
    },
)

celery_app.autodiscover_tasks()