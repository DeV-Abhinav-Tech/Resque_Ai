from datetime import datetime
from typing import List, Optional, Dict, Any
import httpx

from backend.app.data.clients.base import APIClientBase
from backend.app.config import settings


class USGSEarthquakeClient(APIClientBase[Dict[str, Any]]):
    def __init__(self):
        super().__init__(
            base_url=settings.USGS_BASE_URL,
            rate_limit_rpm=settings.USGS_RATE_LIMIT,
            timeout=30.0,
        )

    async def fetch_latest(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        params = {"format": "geojson", "orderby": "time"}
        if since:
            params["starttime"] = since.isoformat()

        response = await self.get("earthquakes/feed/v1.0/summary/all_hour.geojson", params=params)
        data = response.json()
        return data.get("features", [])

    async def fetch_historical(
        self,
        start_time: datetime,
        end_time: datetime,
        min_magnitude: float = 2.5,
        limit: int = 20000,
    ) -> List[Dict[str, Any]]:
        params = {
            "format": "geojson",
            "starttime": start_time.isoformat(),
            "endtime": end_time.isoformat(),
            "minmagnitude": min_magnitude,
            "limit": limit,
            "orderby": "time",
        }
        response = await self.get("fdsnws/event/1/query", params=params)
        data = response.json()
        return data.get("features", [])

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        props = raw.get("properties", {})
        geom = raw.get("geometry", {})
        coords = geom.get("coordinates", [None, None, None])

        return {
            "external_id": raw.get("id", ""),
            "hazard_type": "EARTHQUAKE",
            "severity": self._magnitude_to_severity(props.get("mag", 0)),
            "geometry": {
                "type": "Point",
                "coordinates": [coords[0], coords[1]],
            },
            "timestamp": datetime.fromtimestamp(props.get("time", 0) / 1000),
            "properties": {
                "magnitude": props.get("mag"),
                "magnitude_type": props.get("magType"),
                "depth_km": coords[2] if len(coords) > 2 else None,
                "place": props.get("place"),
                "tsunami": props.get("tsunami", 0),
                "significance": props.get("sig"),
                "alert": props.get("alert"),
                "status": props.get("status"),
                "felt": props.get("felt"),
                "cdi": props.get("cdi"),
                "mmi": props.get("mmi"),
                "gap": props.get("gap"),
                "dmin": props.get("dmin"),
                "rms": props.get("rms"),
                "net": props.get("net"),
                "ids": props.get("ids"),
                "sources": props.get("sources"),
                "types": props.get("types"),
                "nst": props.get("nst"),
            },
            "raw_data": raw,
        }

    def _magnitude_to_severity(self, mag: Optional[float]) -> str:
        if mag is None:
            return "LOW"
        if mag >= 7.0:
            return "CRITICAL"
        elif mag >= 6.0:
            return "HIGH"
        elif mag >= 4.5:
            return "MEDIUM"
        else:
            return "LOW"


class USGSClient:
    def __init__(self):
        self.earthquake = USGSEarthquakeClient()

    async def __aenter__(self):
        await self.earthquake.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.earthquake.__aexit__(exc_type, exc_val, exc_tb)