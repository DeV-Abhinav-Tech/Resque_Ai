import enum
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Enum as SQLEnum,
    Index,
    ForeignKey,
    Float,
    Text,
    JSON,
    Integer,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from backend.app.models.hazard_event import Base, HazardType


class PredictionStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (
        Index("ix_predictions_hazard_type", "hazard_type"),
        Index("ix_predictions_model_version", "model_version"),
        Index("ix_predictions_valid_time_start", "valid_time_start"),
        Index("ix_predictions_valid_time_end", "valid_time_end"),
        Index("ix_predictions_geometry", "geometry", postgresql_using="gist"),
        Index("ix_predictions_hazard_type_valid", "hazard_type", "valid_time_start", "valid_time_end"),
    )

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hazard_type = Column(SQLEnum(HazardType), nullable=False, index=True)
    model_version = Column(String(50), nullable=False, index=True)
    geometry = Column(Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True), nullable=False)
    valid_time_start = Column(DateTime(timezone=True), nullable=False, index=True)
    valid_time_end = Column(DateTime(timezone=True), nullable=False, index=True)
    probability = Column(Float, nullable=False)
    expected_severity = Column(SQLEnum("LOW", "MEDIUM", "HIGH", "CRITICAL", name="severity_level"), nullable=False)
    confidence_lower = Column(Float, nullable=True)
    confidence_upper = Column(Float, nullable=True)
    feature_importance = Column(JSONB, nullable=False, default=dict)
    extra_metadata = Column("metadata", JSONB, nullable=False, default=dict)
    status = Column(SQLEnum(PredictionStatus), default=PredictionStatus.COMPLETED, nullable=False)
    source_event_id = Column(PGUUID(as_uuid=True), ForeignKey("hazard_events.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    source_event = relationship("HazardEvent", back_populates="predictions")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hazard_type = Column(SQLEnum(HazardType), nullable=False)
    version = Column(String(50), nullable=False, unique=True)
    algorithm = Column(String(100), nullable=False)
    framework = Column(String(50), nullable=False)
    training_data_start = Column(DateTime(timezone=True), nullable=False)
    training_data_end = Column(DateTime(timezone=True), nullable=False)
    metrics = Column(JSONB, nullable=False, default=dict)
    hyperparameters = Column(JSONB, nullable=False, default=dict)
    artifact_uri = Column(String(500), nullable=False)
    is_production = Column(Boolean, default=False)
    is_staging = Column(Boolean, default=False)
    deployed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    created_by = Column(String(100), nullable=True)

    __table_args__ = (
        UniqueConstraint("hazard_type", "version", name="uq_hazard_type_version"),
    )