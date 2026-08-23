from celery import shared_task
from datetime import datetime, timedelta
import structlog

logger = structlog.get_logger()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def ingest_realtime(self):
    from backend.app.data.ingestion.pipeline import IngestionPipeline

    pipeline = IngestionPipeline()
    try:
        import asyncio
        result = asyncio.run(pipeline.run_full_ingestion())
        logger.info("Real-time ingestion completed", result=result)
        return result
    except Exception as e:
        logger.error("Real-time ingestion failed", error=str(e))
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2)
def ingest_historical_usgs(self, days_back: int = 365):
    from backend.app.data.ingestion.pipeline import run_historical_backfill
    from backend.app.models.hazard_event import DataSourceType

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days_back)

    try:
        import asyncio
        result = asyncio.run(run_historical_backfill(
            DataSourceType.USGS,
            start_date,
            end_date,
        ))
        logger.info("USGS historical backfill completed", result=result)
        return result
    except Exception as e:
        logger.error("USGS historical backfill failed", error=str(e))
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2)
def ingest_historical_fema(self, days_back: int = 365):
    from backend.app.data.ingestion.pipeline import run_historical_backfill
    from backend.app.models.hazard_event import DataSourceType

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days_back)

    try:
        import asyncio
        result = asyncio.run(run_historical_backfill(
            DataSourceType.FEMA,
            start_date,
            end_date,
        ))
        logger.info("FEMA historical backfill completed", result=result)
        return result
    except Exception as e:
        logger.error("FEMA historical backfill failed", error=str(e))
        raise self.retry(exc=e)