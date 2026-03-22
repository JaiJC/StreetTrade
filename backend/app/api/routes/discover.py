from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.api.deps import DB, Embedder
from app.schemas.discover import (
    DiscoverRequest,
    DiscoverResponse,
    DiscoveredBusinessSummary,
)
from app.services.discovery import discover_area

router = APIRouter()


@router.post("/discover", response_model=DiscoverResponse)
async def discover(req: DiscoverRequest, db: DB, embedder: Embedder) -> DiscoverResponse:
    """Discover businesses in an area using a two-phase pipeline.

    Phase 1: Pull all registered businesses from Vancouver Open Data
    (city business licence registry — no auth, free API).

    Phase 2: Scan Street View tiles with CLIP + OCR to find storefronts
    not in the registry (phantom businesses).

    Both phases cross-reference against Google Places, Reddit, and
    social media to confirm existence and determine phantom status.
    """
    result = await discover_area(
        center_lat=req.latitude,
        center_lng=req.longitude,
        radius_m=req.radius_m,
        step_m=req.step_m,
        db=db,
        embedder=embedder,
        skip_streetview=req.skip_streetview,
        skip_social=req.skip_social,
    )

    summaries = [
        DiscoveredBusinessSummary(
            business_id=d.business_id,
            name=d.name,
            latitude=d.latitude,
            longitude=d.longitude,
            category=d.category,
            tags=d.tags,
            is_phantom=d.is_phantom,
            confidence=round(d.confidence, 3),
            source_types=d.source_types,
        )
        for d in result.discovered
    ]

    return DiscoverResponse(
        center_lat=result.center_lat,
        center_lng=result.center_lng,
        radius_m=result.radius_m,
        registry_count=result.registry_count,
        streetview_tiles_fetched=result.streetview_tiles_fetched,
        streetview_storefronts=result.streetview_storefronts,
        streetview_new_phantoms=result.streetview_new_phantoms,
        total_businesses=result.total_businesses,
        phantom_count=result.phantom_count,
        discovered=summaries,
        completed_at=datetime.now(timezone.utc),
    )
