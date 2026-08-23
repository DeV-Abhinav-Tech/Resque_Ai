import enum
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Enum as SQLEnum,
    Index,
    ForeignKey,
    Text,
    JSON,
    Integer,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from backend.app.models.hazard_event import Base, HazardType


class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WATCH = "WATCH"
    WARNING = "WARNING"
    EMERGENCY = "EMERGENCY"


class AlertStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"
    SUPERSEDED = "SUPERSEDED"


class AlertCertainty(str, enum.Enum):
    OBSERVED = "OBSERVED"
    LIKELY = "LIKELY"
    POSSIBLE = "POSSIBLE"
    UNLIKELY = "UNLIKELY"
    UNKNOWN = "UNKNOWN"


class AlertUrgency(str, enum.Enum):
    IMMEDIATE = "IMMEDIATE"
    EXPECTED = "EXPECTED"
    FUTURE = "FUTURE"
    PAST = "PAST"
    UNKNOWN = "UNKNOWN"


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alerts_hazard_type", "hazard_type"),
        Index("ix_alerts_severity", "severity"),
        Index("ix_alerts_status", "status"),
        Index("ix_alerts_effective", "effective"),
        Index("ix_alerts_expires", "expires"),
        Index("ix_alerts_geometry", "geometry", postgresql_using="gist"),
        Index("ix_alerts_hazard_type_status", "hazard_type", "status"),
    )

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hazard_type = Column(SQLEnum(HazardType), nullable=False, index=True)
    severity = Column(SQLEnum(AlertSeverity), nullable=False, index=True)
    status = Column(SQLEnum(AlertStatus), default=AlertStatus.ACTIVE, nullable=False, index=True)
    certainty = Column(SQLEnum(AlertCertainty), default=AlertCertainty.LIKELY, nullable=False)
    urgency = Column(SQLEnum(AlertUrgency), default=AlertUrgency.EXPECTED, nullable=False)
    geometry = Column(Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True), nullable=False)
    effective = Column(DateTime(timezone=True), nullable=False, index=True)
    expires = Column(DateTime(timezone=True), nullable=False, index=True)
    headline = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    instruction = Column(Text, nullable=True)
    source_predictions = Column(ARRAY(PGUUID(as_uuid=True)), nullable=False, default=[])
    source_events = Column(ARRAY(PGUUID(as_uuid=True)), nullable=False, default=[])
    cap_event = Column(String(100), nullable=True)
    cap_category = Column(String(50), nullable=True)
    cap_response_type = Column(String(50), nullable=True)
    extra_metadata = Column("metadata", JSONB, nullable=False, default=dict)
    acknowledged_by = Column(ARRAY(PGUUID(as_uuid=True)), nullable=False, default=[])
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class AlertSubscription(Base):
    __tablename__ = "alert_subscriptions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    hazard_types = Column(ARRAY(SQLEnum(HazardType)), nullable=False, default=[])
    min_severity = Column(SQLEnum(AlertSeverity), default=AlertSeverity.WATCH, nullable=False)
    geometry = Column(Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True), nullable=True)
    notify_email = Column(Boolean, default=True)
    notify_sms = Column(Boolean, default=False)
    notify_push = Column(Boolean, default=True)
    notify_webhook = Column(Boolean, default=False)
    webhook_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="alert_subscriptions")