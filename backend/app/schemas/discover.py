from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DiscoverRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius_m: float = Field(default=500.0, gt=0, le=5000)
    step_m: float = Field(default=50.0, gt=10, le=200)
    skip_streetview: bool = Field(default=False)
    skip_social: bool = Field(default=False)


class DiscoveredBusinessSummary(BaseModel):
    business_id: uuid.UUID | None
    name: str
    latitude: float
    longitude: float
    category: str | None
    tags: list[str]
    is_phantom: bool
    confidence: float
    source_types: list[str]


class DiscoverResponse(BaseModel):
    center_lat: float
    center_lng: float
    radius_m: float
    registry_count: int
    streetview_tiles_fetched: int
    streetview_storefronts: int
    streetview_new_phantoms: int
    total_businesses: int
    phantom_count: int
    discovered: list[DiscoveredBusinessSummary]
    completed_at: datetime
