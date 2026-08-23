import asyncio
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

import structlog
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.config import settings
from backend.app.database import AsyncSessionLocal
from backend.app.models.hazard_event import HazardEvent, DataSource, IngestionLog, HazardType, DataSourceType, SeverityLevel
from backend.app.data.clients.usgs import USGSClient
from backend.app.data.clients.noaa import NOAAClient
from backend.app.data.clients.fema import FEMAClient
from backend.app.data.clients.weather import UnifiedWeatherClient
from backend.app.data.clients.satellite import SatelliteClient

logger = structlog.get_logger()


class IngestionPipeline:
    def __init__(self):
        self.usgs = USGSClient()
        self.noaa = NOAAClient()
        self.fema = FEMAClient()
        self.weather = UnifiedWeatherClient()
        self.satellite = SatelliteClient()

    async def run_full_ingestion(self) -> Dict[str, Any]:
        results = {}
        async with self.usgs, self.noaa, self.fema, self.weather, self.satellite:
            tasks = [
                self._ingest_usgs_earthquakes(),
                self._ingest_noaa_alerts(),
                self._ingest_fema_declarations(),
            ]
            task_results = await asyncio.gather(*tasks, return_exceptions=True)

            for i, result in enumerate(task_results):
                source_name = ["USGS", "NOAA", "FEMA"][i]
                if isinstance(result, Exception):
                    logger.error(f"Ingestion failed for {source_name}", error=str(result))
                    results[source_name] = {"status": "failed", "error": str(result)}
                else:
                    results[source_name] = result

        return results

    async def _ingest_usgs_earthquakes(self) -> Dict[str, Any]:
        return await self._ingest_source(
            source_type=DataSourceType.USGS,
            fetch_func=self.usgs.earthquake.fetch_latest,
            normalize_func=self.usgs.earthquake.normalize,
        )

    async def _ingest_noaa_alerts(self) -> Dict[str, Any]:
        return await self._ingest_source(
            source_type=DataSourceType.NOAA_NWS,
            fetch_func=self.noaa.fetch_latest,
            normalize_func=self.noaa.normalize,
        )

    async def _ingest_fema_declarations(self) -> Dict[str, Any]:
        return await self._ingest_source(
            source_type=DataSourceType.FEMA,
            fetch_func=self.fema.fetch_latest,
            normalize_func=self.fema.normalize,
        )

    async def _ingest_source(
        self,
        source_type: DataSourceType,
        fetch_func,
        normalize_func,
        since: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        started_at = datetime.utcnow()
        log_id = uuid.uuid4()

        async with AsyncSessionLocal() as session:
            log = IngestionLog(
                id=log_id,
                data_source_id=await self._get_or_create_source_id(session, source_type),
                status="SUCCESS",
                started_at=started_at,
            )
            session.add(log)
            await session.commit()

        try:
            raw_events = await fetch_func(since)
            logger.info(f"Fetched {len(raw_events)} raw events from {source_type.value}")

            normalized = [normalize_func(e) for e in raw_events]
            inserted, updated = await self._bulk_upsert_events(normalized)

            completed_at = datetime.utcnow()
            async with AsyncSessionLocal() as session:
                log = await session.get(IngestionLog, log_id)
                log.status = "SUCCESS"
                log.records_processed = len(raw_events)
                log.records_inserted = inserted
                log.records_updated = updated
                log.completed_at = completed_at
                await session.commit()

            return {
                "status": "success",
                "processed": len(raw_events),
                "inserted": inserted,
                "updated": updated,
                "duration_seconds": (completed_at - started_at).total_seconds(),
            }

        except Exception as e:
            completed_at = datetime.utcnow()
            async with AsyncSessionLocal() as session:
                log = await session.get(IngestionLog, log_id)
                log.status = "FAILED"
                log.error_message = str(e)
                log.completed_at = completed_at
                await session.commit()

            logger.error(f"Ingestion failed for {source_type.value}", error=str(e))
            return {"status": "failed", "error": str(e)}

    async def _get_or_create_source_id(self, session: AsyncSession, source_type: DataSourceType) -> uuid.UUID:
        result = await session.execute(
            select(DataSource.id).where(DataSource.source_type == source_type)
        )
        source_id = result.scalar_one_or_none()

        if source_id:
            return source_id

        source = DataSource(
            name=source_type.value,
            source_type=source_type,
            base_url=self._get_base_url(source_type),
            rate_limit_rpm=self._get_rate_limit(source_type),
        )
        session.add(source)
        await session.flush()
        return source.id

    def _get_base_url(self, source_type: DataSourceType) -> str:
        urls = {
            DataSourceType.USGS: settings.USGS_BASE_URL,
            DataSourceType.NOAA_NWS: settings.NOAA_BASE_URL,
            DataSourceType.FEMA: settings.FEMA_BASE_URL,
            DataSourceType.OPENWEATHER: settings.OPENWEATHER_BASE_URL,
            DataSourceType.WEATHERAPI: settings.WEATHERAPI_BASE_URL,
            DataSourceType.NASA_FIRMS: settings.NASA_FIRMS_BASE_URL,
        }
        return urls.get(source_type, "")

    def _get_rate_limit(self, source_type: DataSourceType) -> int:
        limits = {
            DataSourceType.USGS: settings.USGS_RATE_LIMIT,
            DataSourceType.NOAA_NWS: settings.NOAA_RATE_LIMIT,
            DataSourceType.FEMA: settings.FEMA_RATE_LIMIT,
            DataSourceType.OPENWEATHER: settings.OPENWEATHER_RATE_LIMIT,
            DataSourceType.WEATHERAPI: settings.WEATHERAPI_RATE_LIMIT,
        }
        return limits.get(source_type, 60)

    async def _bulk_upsert_events(self, events: List[Dict[str, Any]]) -> tuple[int, int]:
        if not events:
            return 0, 0

        async with AsyncSessionLocal() as session:
            inserted = 0
            updated = 0

            for event_data in events:
                stmt = insert(HazardEvent).values(
                    id=uuid.uuid4(),
                    hazard_type=HazardType(event_data["hazard_type"]),
                    severity=SeverityLevel(event_data["severity"]),
                    geometry=event_data["geometry"],
                    timestamp=event_data["timestamp"],
                    source=DataSourceType(event_data.get("source", "CUSTOM")),
                    external_id=event_data["external_id"],
                    properties=event_data["properties"],
                    raw_data=event_data["raw_data"],
                )

                stmt = stmt.on_conflict_do_update(
                    index_elements=["source", "external_id"],
                    set_={
                        "hazard_type": stmt.excluded.hazard_type,
                        "severity": stmt.excluded.severity,
                        "geometry": stmt.excluded.geometry,
                        "timestamp": stmt.excluded.timestamp,
                        "properties": stmt.excluded.properties,
                        "raw_data": stmt.excluded.raw_data,
                        "updated_at": datetime.utcnow(),
                    },
                ).returning(HazardEvent.id)

                result = await session.execute(stmt)
                if result.rowcount > 0:
                    inserted += 1
                else:
                    updated += 1

            await session.commit()
            return inserted, updated


async def run_historical_backfill(
    source_type: DataSourceType,
    start_date: datetime,
    end_date: datetime,
    batch_days: int = 30,
) -> Dict[str, Any]:
    pipeline = IngestionPipeline()
    total_inserted = 0
    total_updated = 0

    async with pipeline.usgs, pipeline.noaa, pipeline.fema:
        current = start_date
        while current < end_date:
            batch_end = min(current + timedelta(days=batch_days), end_date)
            logger.info(f"Backfilling {source_type.value} from {current} to {batch_end}")

            if source_type == DataSourceType.USGS:
                raw = await pipeline.usgs.earthquake.fetch_historical(current, batch_end)
                normalized = [pipeline.usgs.earthquake.normalize(e) for e in raw]
            elif source_type == DataSourceType.FEMA:
                raw = await pipeline.fema.fetch_historical(current, batch_end)
                normalized = [pipeline.fema.normalize(e) for e in raw]
            else:
                logger.warning(f"Historical backfill not implemented for {source_type.value}")
                break

            inserted, updated = await pipeline._bulk_upsert_events(normalized)
            total_inserted += inserted
            total_updated += updated

            current = batch_end
            await asyncio.sleep(1)

    return {"inserted": total_inserted, "updated": total_updated}