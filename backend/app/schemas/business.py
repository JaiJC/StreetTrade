from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.business import EvidenceType
from app.models.embedding import EmbeddingType


class EvidenceSourceOut(BaseModel):
    id: uuid.UUID
    type: EvidenceType
    raw_reference: str
    features: dict | None
    created_at: datetime

    model_config = {"from_attributes": True}


class EmbeddingOut(BaseModel):
    embedding_type: EmbeddingType
    last_updated: datetime

    model_config = {"from_attributes": True}


class BusinessOut(BaseModel):
    id: uuid.UUID
    canonical_name: str
    normalized_address: str | None
    latitude: float
    longitude: float
    primary_category: str | None
    secondary_tags: list[str] | None
    source_confidence_score: float
    evidence_summary: dict | None
    evidence_sources: list[EvidenceSourceOut]
    embeddings: list[EmbeddingOut]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
