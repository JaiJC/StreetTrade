import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class EvidenceType(str, enum.Enum):
    STREET_VIEW = "street_view"
    CITY_REGISTRY = "city_registry"
    LOCAL_LISTING_API = "local_listing_api"
    WEBSITE = "website"
    SOCIAL = "social"


class Business(Base):
    __tablename__ = "business"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    canonical_name: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_address: Mapped[str | None] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    primary_category: Mapped[str | None] = mapped_column(String(100))
    secondary_tags: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    source_confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    evidence_summary: Mapped[dict | None] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    evidence_sources: Mapped[list["EvidenceSource"]] = relationship(
        back_populates="business", cascade="all, delete-orphan", lazy="selectin"
    )
    embeddings: Mapped[list["BusinessEmbedding"]] = relationship(
        back_populates="business", cascade="all, delete-orphan", lazy="selectin"
    )

    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90", name="ck_business_lat"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="ck_business_lng"),
        CheckConstraint(
            "source_confidence_score BETWEEN 0 AND 1", name="ck_business_confidence"
        ),
        Index("ix_business_category", "primary_category"),
        Index("ix_business_location", "latitude", "longitude"),
    )


class EvidenceSource(Base):
    __tablename__ = "evidence_source"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("business.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[EvidenceType] = mapped_column(
        Enum(EvidenceType, name="evidence_type_enum", values_callable=lambda e: [x.value for x in e]), nullable=False
    )
    raw_reference: Mapped[str] = mapped_column(Text, nullable=False)
    features: Mapped[dict | None] = mapped_column(JSONB)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    business: Mapped["Business"] = relationship(back_populates="evidence_sources")

    __table_args__ = (
        Index("ix_evidence_business", "business_id"),
        Index("ix_evidence_type", "type"),
    )
