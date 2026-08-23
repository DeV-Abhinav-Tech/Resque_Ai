import enum
import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Enum as SQLEnum,
    Index,
    Text,
    JSON,
    ForeignKey,
    UniqueConstraint,
    Integer,
    Boolean,
    Float,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship, declarative_base
from geoalchemy2 import Geometry

Base = declarative_base()


class HazardType(str, enum.Enum):
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


class SeverityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DataSourceType(str, enum.Enum):
    USGS = "USGS"
    NOAA_NWS = "NOAA_NWS"
    NOAA_NHC = "NOAA_NHC"
    FEMA = "FEMA"
    OPENWEATHER = "OPENWEATHER"
    WEATHERAPI = "WEATHERAPI"
    NASA_FIRMS = "NASA_FIRMS"
    SATELLITE = "SATELLITE"
    IOT_SENSOR = "IOT_SENSOR"
    CUSTOM = "CUSTOM"


class HazardEvent(Base):
    __tablename__ = "hazard_events"
    __table_args__ = (
        Index("ix_hazard_events_hazard_type", "hazard_type"),
        Index("ix_hazard_events_timestamp", "timestamp"),
        Index("ix_hazard_events_source", "source"),
        Index("ix_hazard_events_geometry", "geometry", postgresql_using="gist"),
        Index("ix_hazard_events_hazard_type_timestamp", "hazard_type", "timestamp"),
        {"postgresql_partition_by": "RANGE (timestamp)"},
    )

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hazard_type = Column(SQLEnum(HazardType), nullable=False, index=True)
    severity = Column(SQLEnum(SeverityLevel), nullable=False)
    geometry = Column(Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    source = Column(SQLEnum(DataSourceType), nullable=False, index=True)
    external_id = Column(String(255), nullable=False)
    properties = Column(JSONB, nullable=False, default=dict)
    raw_data = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_source_external_id"),
    )

    predictions = relationship("Prediction", back_populates="source_event", lazy="dynamic")


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    source_type = Column(SQLEnum(DataSourceType), nullable=False)
    base_url = Column(String(500), nullable=False)
    api_key = Column(String(255), nullable=True)
    rate_limit_rpm = Column(Integer, default=60)
    is_active = Column(Boolean, default=True)
    config = Column(JSONB, nullable=False, default=dict)
    last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    consecutive_failures = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class IngestionLog(Base):
    __tablename__ = "ingestion_logs"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_source_id = Column(PGUUID(as_uuid=True), ForeignKey("data_sources.id"), nullable=False)
    status = Column(SQLEnum("SUCCESS", "PARTIAL", "FAILED", name="ingestion_status"), nullable=False)
    records_processed = Column(Integer, default=0)
    records_inserted = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    extra_metadata = Column("metadata", JSONB, nullable=False, default=dict)

    data_source = relationship("DataSource")