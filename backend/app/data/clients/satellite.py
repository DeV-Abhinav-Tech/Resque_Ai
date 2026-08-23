from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import httpx
import csv
import io

from backend.app.data.clients.base import APIClientBase
from backend.app.config import settings


class NASAFIRMSClient(APIClientBase[Dict[str, Any]]):
    def __init__(self):
        super().__init__(
            base_url=settings.NASA_FIRMS_BASE_URL,
            rate_limit_rpm=30,
            timeout=60.0,
            api_key=settings.NASA_FIRMS_KEY,
        )

    async def fetch_latest(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        if not self.api_key:
            return []

        area = "world"
        day_range = 1
        if since:
            days_back = (datetime.utcnow() - since).days
            day_range = max(1, days_back)

        params = {
            "map_key": self.api_key,
            "source": "VIIRS_SNPP_NRT",
            "area": area,
            "day": day_range,
        }

        try:
            response = await self.get("api/country/csv", params=params)
            return self._parse_csv(response.text)
        except Exception:
            return []

    async def fetch_by_bbox(
        self,
        bbox: tuple[float, float, float, float],
        days: int = 1,
        source: str = "VIIRS_SNPP_NRT",
    ) -> List[Dict[str, Any]]:
        if not self.api_key:
            return []

        min_lon, min_lat, max_lon, max_lat = bbox
        params = {
            "map_key": self.api_key,
            "source": source,
            "area": f"{min_lon},{min_lat},{max_lon},{max_lat}",
            "day": days,
        }

        try:
            response = await self.get("api/area/csv", params=params)
            return self._parse_csv(response.text)
        except Exception:
            return []

    def _parse_csv(self, csv_text: str) -> List[Dict[str, Any]]:
        if not csv_text.strip():
            return []

        reader = csv.DictReader(io.StringIO(csv_text))
        return list(reader)

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        lat = float(raw.get("latitude", 0))
        lon = float(raw.get("longitude", 0))
        brightness = float(raw.get("brightness", 0))
        confidence = raw.get("confidence", "low")

        return {
            "external_id": f"firms_{raw.get('latitude')}_{raw.get('longitude')}_{raw.get('acq_date')}_{raw.get('acq_time')}",
            "hazard_type": "WILDFIRE",
            "severity": self._confidence_to_severity(confidence),
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "timestamp": datetime.strptime(
                f"{raw.get('acq_date')} {raw.get('acq_time'):0>4}",
                "%Y-%m-%d %H%M"
            ),
            "properties": {
                "brightness": brightness,
                "bright_t31": float(raw.get("bright_t31", 0)),
                "frp": float(raw.get("frp", 0)),
                "confidence": confidence,
                "scan": float(raw.get("scan", 0)),
                "track": float(raw.get("track", 0)),
                "satellite": raw.get("satellite"),
                "instrument": raw.get("instrument"),
                "daynight": raw.get("daynight"),
                "version": raw.get("version"),
            },
            "raw_data": raw,
        }

    def _confidence_to_severity(self, confidence: str) -> str:
        mapping = {
            "high": "HIGH",
            "nominal": "MEDIUM",
            "low": "LOW",
        }
        return mapping.get(confidence.lower(), "LOW")


class SatelliteClient:
    def __init__(self):
        self.firms = NASAFIRMSClient()

    async def __aenter__(self):
        await self.firms.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.firms.__aexit__(exc_type, exc_val, exc_tb)