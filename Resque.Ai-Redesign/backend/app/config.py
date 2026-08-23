from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    APP_NAME: str = "Resque.AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # API
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/resque",
        description="Async PostgreSQL connection URL",
    )
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30

    # Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL",
    )
    REDIS_MAX_CONNECTIONS: int = 50
    CACHE_TTL_SECONDS: int = 300

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_RAW_EVENTS: str = "raw.events"
    KAFKA_TOPIC_NORMALIZED_EVENTS: str = "normalized.events"
    KAFKA_TOPIC_ALERTS: str = "alerts"
    KAFKA_CONSUMER_GROUP: str = "resque-ingestion"

    # MinIO / S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_MODELS: str = "models"
    MINIO_BUCKET_DATA: str = "raw-data"
    MINIO_SECURE: bool = False

    # MLflow
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    MLFLOW_EXPERIMENT_NAME: str = "resque-hazard-prediction"

    # External APIs
    USGS_BASE_URL: str = "https://earthquake.usgs.gov"
    NOAA_BASE_URL: str = "https://api.weather.gov"
    FEMA_BASE_URL: str = "https://www.fema.gov/api/open"
    OPENWEATHER_API_KEY: Optional[str] = None
    OPENWEATHER_BASE_URL: str = "https://api.openweathermap.org/data/2.5"
    WEATHERAPI_KEY: Optional[str] = None
    WEATHERAPI_BASE_URL: str = "http://api.weatherapi.com/v1"
    NASA_FIRMS_KEY: Optional[str] = None
    NASA_FIRMS_BASE_URL: str = "https://firms.modaps.eosdis.nasa.gov/api"

    # Rate Limits (requests per minute)
    USGS_RATE_LIMIT: int = 60
    NOAA_RATE_LIMIT: int = 100
    FEMA_RATE_LIMIT: int = 60
    OPENWEATHER_RATE_LIMIT: int = 60
    WEATHERAPI_RATE_LIMIT: int = 60

    # Ingestion
    INGESTION_INTERVAL_MINUTES: int = 5
    HISTORICAL_INGESTION_DAYS_BACK: int = 365
    BATCH_SIZE: int = 1000

    # ML Models
    MODEL_CACHE_TTL_SECONDS: int = 3600
    PREDICTION_GRID_RESOLUTION_DEG: float = 0.1
    EARTHQUAKE_MODEL_VERSION: str = "eq_v1.0"
    FLOOD_MODEL_VERSION: str = "flood_v1.0"
    HURRICANE_MODEL_VERSION: str = "hurricane_v1.0"

    # Alert Thresholds
    EQ_WATCH_PROBABILITY: float = 0.15
    EQ_WARNING_PROBABILITY: float = 0.30
    FLOOD_WATCH_PROBABILITY: float = 0.40
    FLOOD_WARNING_PROBABILITY: float = 0.70
    HURRICANE_WATCH_DAYS: int = 5
    HURRICANE_WARNING_DAYS: int = 2

    # Security
    SECRET_KEY: str = Field(default="change-me-in-production-resque-ai-secret-key", min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    API_KEY_HEADER: str = "X-API-Key"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Monitoring
    PROMETHEUS_METRICS_PATH: str = "/metrics"
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Map
    MAPBOX_TOKEN: Optional[str] = None
    DEFAULT_MAP_CENTER_LAT: float = 39.8283
    DEFAULT_MAP_CENTER_LON: float = -98.5795
    DEFAULT_MAP_ZOOM: int = 4


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()