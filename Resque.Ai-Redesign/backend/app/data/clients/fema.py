from datetime import datetime
from typing import List, Optional, Dict, Any

from backend.app.data.clients.base import APIClientBase
from backend.app.config import settings


class FEMAClient(APIClientBase[Dict[str, Any]]):
    def __init__(self):
        super().__init__(
            base_url=settings.FEMA_BASE_URL,
            rate_limit_rpm=settings.FEMA_RATE_LIMIT,
            timeout=30.0,
        )

    async def fetch_latest(self, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
        params = {"$top": 1000, "$orderby": "declarationDate desc"}
        if since:
            params["$filter"] = f"declarationDate ge {since.isoformat()}"

        response = await self.get("v2/DisasterDeclarationsSummaries", params=params)
        data = response.json()
        return data.get("DisasterDeclarationsSummaries", [])

    async def fetch_historical(
        self,
        start_date: datetime,
        end_date: datetime,
        state: Optional[str] = None,
        incident_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        filter_parts = [
            f"declarationDate ge {start_date.isoformat()}",
            f"declarationDate le {end_date.isoformat()}",
        ]
        if state:
            filter_parts.append(f"state eq '{state}'")
        if incident_type:
            filter_parts.append(f"incidentType eq '{incident_type}'")

        params = {
            "$filter": " and ".join(filter_parts),
            "$top": 5000,
            "$orderby": "declarationDate desc",
        }

        response = await self.get("v2/DisasterDeclarationsSummaries", params=params)
        data = response.json()
        return data.get("DisasterDeclarationsSummaries", [])

    async def fetch_hazard_mitigation_projects(self, state: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {"$top": 1000}
        if state:
            params["$filter"] = f"state eq '{state}'"
        response = await self.get("v2/HazardMitigationProjects", params=params)
        data = response.json()
        return data.get("HazardMitigationProjects", [])

    def normalize(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        declaration_date = raw.get("declarationDate")
        incident_type = raw.get("incidentType", "")

        hazard_type = self._incident_type_to_hazard(incident_type)

        return {
            "external_id": raw.get("disasterNumber", ""),
            "hazard_type": hazard_type,
            "severity": self._declaration_to_severity(raw.get("declarationType", "")),
            "geometry": {
                "type": "Point",
                "coordinates": [
                    raw.get("longitude", 0),
                    raw.get("latitude", 0),
                ] if raw.get("latitude") and raw.get("longitude") else [0, 0],
            },
            "timestamp": datetime.fromisoformat(declaration_date.replace("Z", "+00:00")) if declaration_date else datetime.utcnow(),
            "properties": {
                "disaster_number": raw.get("disasterNumber"),
                "declaration_type": raw.get("declarationType"),
                "incident_type": incident_type,
                "title": raw.get("declarationTitle"),
                "state": raw.get("state"),
                "county": raw.get("county"),
                "fips_county_code": raw.get("fipsCountyCode"),
                "declaration_date": declaration_date,
                "incident_begin_date": raw.get("incidentBeginDate"),
                "incident_end_date": raw.get("incidentEndDate"),
                "closeout_date": raw.get("closeoutDate"),
                "federal_share_obligated": raw.get("federalShareObligated"),
                "total_obligated": raw.get("totalObligated"),
                "individual_assistance": raw.get("individualAssistanceProgramDeclared"),
                "public_assistance": raw.get("publicAssistanceProgramDeclared"),
                "hazard_mitigation": raw.get("hazardMitigationProgramDeclared"),
            },
            "raw_data": raw,
        }

    def _incident_type_to_hazard(self, incident_type: str) -> str:
        mapping = {
            "Flood": "FLOOD",
            "Hurricane": "HURRICANE",
            "Tropical Storm": "HURRICANE",
            "Severe Storm": "OTHER",
            "Tornado": "TORNADO",
            "Earthquake": "EARTHQUAKE",
            "Wildfire": "WILDFIRE",
            "Fire": "WILDFIRE",
            "Winter Storm": "WINTER_STORM",
            "Snow": "WINTER_STORM",
            "Ice Storm": "WINTER_STORM",
            "Drought": "DROUGHT",
            "Heat": "HEAT_WAVE",
            "Landslide": "LANDSLIDE",
            "Mudslide": "LANDSLIDE",
            "Tsunami": "TSUNAMI",
            "Volcano": "VOLCANO",
        }
        return mapping.get(incident_type, "OTHER")

    def _declaration_to_severity(self, declaration_type: str) -> str:
        if "Major" in declaration_type:
            return "CRITICAL"
        elif "Emergency" in declaration_type:
            return "HIGH"
        else:
            return "MEDIUM"