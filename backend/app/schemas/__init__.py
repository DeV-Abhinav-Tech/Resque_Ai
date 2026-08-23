from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator
from uuid import UUID


class Coordinates(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class BoundingBox(BaseModel):
    min_lon: float = Field(..., ge=-180, le=180)
    min_lat: float = Field(..., ge=-90, le=90)
    max_lon: float = Field(..., ge=-180, le=180)
    max_lat: float = Field(..., ge=-90, le=90)


class HazardType(str, Enum):
    EARTHQUAKE = "EARTHQUAKE"
    FLOOD = "FLOOD"
    HURRICANE = "HURRICANE"
    TSUNAMI = "TSUNAMI"
    VOLCANO = "VOLCANO"
    WILDFIRE = "WILDFIRE"
    LANDSLIDE = "LANDSLIDE"
    TORNADO = "TORNADO"
    WINTER_STORM = "WINTER_STORM"
    HEAT_WAVE = "HEAT_WAVE"
    DROUGHT = "DROUGHT"
    OTHER = "OTHER"


class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WATCH = "WATCH"
    WARNING = "WARNING"
    EMERGENCY = "EMERGENCY"


class EarthquakePredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=100, ge=1, le=500)
    time_horizon_days: int = Field(default=7, ge=1, le=30)
    magnitude_threshold: float = Field(default=5.0, ge=3.0, le=9.0)


class EarthquakePredictionCell(BaseModel):
    model_config = {"protected_namespaces": ()}
    grid_id: str
    latitude: float
    longitude: float
    probability_m5_plus: float
    probability_m6_plus: Optional[float] = None
    probability_m7_plus: Optional[float] = None
    confidence: float
    severity: SeverityLevel
    model_version: str


class EarthquakePredictionResponse(BaseModel):
    predictions: List[EarthquakePredictionCell]
    metadata: Dict[str, Any]


class FloodPredictionRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=50, ge=1, le=200)
    time_horizon_hours: int = Field(default=48, ge=1, le=168)


class FloodPredictionZone(BaseModel):
    model_config = {"protected_namespaces": ()}
    zone_id: str
    geometry: Dict[str, Any]
    probability: float
    expected_depth_m: Optional[float] = None
    severity: SeverityLevel
    model_version: str


class FloodPredictionResponse(BaseModel):
    zones: List[FloodPredictionZone]
    metadata: Dict[str, Any]


class HurricanePredictionRequest(BaseModel):
    storm_id: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

    @field_validator("storm_id")
    @classmethod
    def require_storm_or_coords(cls, v, info):
        if v is None and (info.data.get("latitude") is None or info.data.get("longitude") is None):
            raise ValueError("Either storm_id or latitude/longitude must be provided")
        return v


class HurricaneTrackPoint(BaseModel):
    hour: int
    latitude: float
    longitude: float
    max_wind_kt: float
    wind_radii_kt: Optional[Dict[int, Dict[str, float]]] = None


class HurricaneIntensityForecast(BaseModel):
    hour: int
    max_wind_kt: float
    min_pressure_mb: Optional[float] = None
    ri_probability: float


class HurricaneLandfallProb(BaseModel):
    segment: str
    probability: float
    expected_time: Optional[datetime] = None


class HurricanePredictionResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    storm_id: str
    advisory_number: int
    track_forecast: List[HurricaneTrackPoint]
    intensity_forecast: List[HurricaneIntensityForecast]
    landfall_probabilities: List[HurricaneLandfallProb]
    model_version: str
    metadata: Dict[str, Any]


class HazardEventResponse(BaseModel):
    id: UUID
    hazard_type: HazardType
    severity: SeverityLevel
    geometry: Dict[str, Any]
    timestamp: datetime
    source: str
    properties: Dict[str, Any]


class HistoricalQueryParams(BaseModel):
    hazard_type: Optional[HazardType] = None
    severity: Optional[SeverityLevel] = None
    source: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_lat: Optional[float] = Field(None, ge=-90, le=90)
    max_lat: Optional[float] = Field(None, ge=-90, le=90)
    min_lon: Optional[float] = Field(None, ge=-180, le=180)
    max_lon: Optional[float] = Field(None, ge=-180, le=180)
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class AlertResponse(BaseModel):
    id: UUID
    hazard_type: HazardType
    severity: AlertSeverity
    status: str
    geometry: Dict[str, Any]
    effective: datetime
    expires: datetime
    headline: str
    description: str
    instruction: Optional[str] = None
    certainty: str
    urgency: str


class AlertSubscriptionRequest(BaseModel):
    hazard_types: List[HazardType] = Field(default_factory=list)
    min_severity: AlertSeverity = AlertSeverity.WATCH
    geometry: Optional[Dict[str, Any]] = None
    notify_email: bool = True
    notify_sms: bool = False
    notify_push: bool = True
    notify_webhook: bool = False
    webhook_url: Optional[str] = None


class AlertSubscriptionResponse(BaseModel):
    id: UUID
    hazard_types: List[HazardType]
    min_severity: AlertSeverity
    geometry: Optional[Dict[str, Any]]
    notify_email: bool
    notify_sms: bool
    notify_push: bool
    notify_webhook: bool
    webhook_url: Optional[str]
    is_active: bool
    created_at: datetime


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    services: Dict[str, str]


class ModelInfoResponse(BaseModel):
    hazard_type: HazardType
    version: str
    algorithm: str
    framework: str
    training_data_start: datetime
    training_data_end: datetime
    metrics: Dict[str, Any]
    is_production: bool
    is_staging: bool
    deployed_at: Optional[datetime]


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "ANALYST"


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse