from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.business import EvidenceType


class SearchRequest(BaseModel):
    query_text: str = Field(..., min_length=1, max_length=500)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_km: float = Field(default=2.0, gt=0, le=50)
    limit: int = Field(default=20, ge=1, le=100)


class EvidenceSignal(BaseModel):
    type: EvidenceType
    raw_reference: str
    features: dict | None = None


class WhyExplanation(BaseModel):
    """Structured explanation of why a result matched the query."""
    matching_tags: list[str]
    has_visual_evidence: bool
    has_social_signal: bool
    has_registry_record: bool
    is_listed_online: bool
    evidence_type_count: int


class SearchResultItem(BaseModel):
    business_id: uuid.UUID
    canonical_name: str
    normalized_address: str | None
    latitude: float
    longitude: float
    primary_category: str | None
    secondary_tags: list[str] | None
    source_confidence_score: float
    distance_m: float
    similarity: float
    hybrid_score: float
    is_phantom: bool
    why: WhyExplanation
    evidence_signals: list[EvidenceSignal]


class SearchResponse(BaseModel):
    query_text: str
    latitude: float
    longitude: float
    radius_km: float
    result_count: int
    results: list[SearchResultItem]
    searched_at: datetime
