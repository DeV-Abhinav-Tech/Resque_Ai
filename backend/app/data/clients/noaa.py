from datetime import datetime
from typing import List, Optional, Dict, Any
import httpx

from backend.app.data.clients.base import APIClientBase
from backend.app.config import settings


class NOAAClient(APIClientBase[Dict[str, Any]]):
    def __init__(self):
        super().__init__(
            base_url=settings.NOAA_BASE_URL,
            rate_limit_rpm=settings.NOAA_RATE_LIMIT,
            timeout=30.0,
            headers={"Accept": "application/geo+json"},
        )

    async def fetch_latest(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        params = {"status": "actual", "message_type": "alert"}
        if since:
            params["start"] = since.isoformat()

        response = await self.get("alerts/active", params=params)
        data = response.json()
        return data.get("features", [])

    async def fetch_hurricane_advisories(self, storm_id: Optional[str] = None) -> List[Dict[str, Any]]:
        path = f"products/tropical/{storm_id}" if storm_id else "products/tropical"
        response = await self.get(path)
        return response.json()

    async def fetch_forecast_office(self, office: str) -> Dict[str, Any]:
        response = await self.get(f"offices/{office}")
        return response.json()

    async def fetch_gridpoint_forecast(self, office: str, grid_x: int, grid_y: int) -> Dict[str, Any]:
        response = await self.get(f"gridpoints/{office}/{grid_x},{grid_y}/forecast")
        return response.json()

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        props = raw.get("properties", {})
        geom = raw.get("geometry")

        event = props.get("event", "")
        severity = props.get("severity", "Unknown")
        certainty = props.get("certainty", "Unknown")
        urgency = props.get("urgency", "Unknown")

        hazard_type = self._event_to_hazard_type(event)

        return {
            "external_id": props.get("id", ""),
            "hazard_type": hazard_type,
            "severity": self._cap_severity_to_internal(severity),
            "geometry": geom or {"type": "Polygon", "coordinates": []},
            "timestamp": datetime.fromisoformat(props.get("onset", datetime.utcnow().isoformat()).replace("Z", "+00:00")),
            "properties": {
                "event": event,
                "severity": severity,
                "certainty": certainty,
                "urgency": urgency,
                "areas": props.get("areaDesc", ""),
                "geocode": props.get("geocode", {}),
                "parameters": props.get("parameters", {}),
                "instruction": props.get("instruction", ""),
                "response": props.get("response", ""),
                "sender_name": props.get("senderName", ""),
                "headline": props.get("headline", ""),
                "description": props.get("description", ""),
                "expires": props.get("expires"),
                "effective": props.get("onset"),
            },
            "raw_data": raw,
        }

    def _event_to_hazard_type(self, event: str) -> str:
        event_lower = event.lower()
        if any(kw in event_lower for kw in ["hurricane", "tropical storm", "typhoon", "cyclone"]):
            return "HURRICANE"
        elif any(kw in event_lower for kw in ["flood", "flash flood", "coastal flood", "river flood"]):
            return "FLOOD"
        elif any(kw in event_lower for kw in ["tornado", "waterspout"]):
            return "TORNADO"
        elif any(kw in event_lower for kw in ["winter storm", "blizzard", "ice storm", "heavy snow"]):
            return "WINTER_STORM"
        elif any(kw in event_lower for kw in ["heat", "excessive heat"]):
            return "HEAT_WAVE"
        elif any(kw in event_lower for kw in ["fire", "wildfire", "red flag"]):
            return "WILDFIRE"
        elif any(kw in event_lower for kw in ["high wind", "wind advisory", "gale"]):
            return "OTHER"
        else:
            return "OTHER"

    def _cap_severity_to_internal(self, severity: str) -> str:
        mapping = {
            "Extreme": "CRITICAL",
            "Severe": "HIGH",
            "Moderate": "MEDIUM",
            "Minor": "LOW",
            "Unknown": "LOW",
        }
        return mapping.get(severity, "LOW")


class NOAANHCClient(APIClientBase[Dict[str, Any]]):
    def __init__(self):
        super().__init__(
            base_url="https://www.nhc.noaa.gov",
            rate_limit_rpm=30,
            timeout=30.0,
        )

    async def fetch_latest(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        response = await self.get("gis/atcf.zip")
        return []

    async def fetch_active_storms(self) -> List[Dict[str, Any]]:
        response = await self.get("gis/atcf.zip")
        return []

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        return {}