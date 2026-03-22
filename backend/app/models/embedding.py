import enum
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import settings
from app.db import Base


class EmbeddingType(str, enum.Enum):
    TEXT_INTENT = "text_intent"
    VISUAL_VIBE = "visual_vibe"
    SOCIAL_VIBE = "social_vibe"


class BusinessEmbedding(Base):
    __tablename__ = "business_embedding"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("business.id", ondelete="CASCADE"),
        nullable=False,
    )
    embedding_type: Mapped[EmbeddingType] = mapped_column(
        Enum(EmbeddingType, name="embedding_type_enum"), nullable=False
    )
    embedding = mapped_column(Vector(settings.embedding_dimensions), nullable=False)

    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    business: Mapped["Business"] = relationship(back_populates="embeddings")

    __table_args__ = (
        UniqueConstraint("business_id", "embedding_type", name="uq_business_embedding_type"),
        Index("ix_embedding_business", "business_id"),
    )
