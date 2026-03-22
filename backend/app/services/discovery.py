"""Discovery orchestrator — the main pipeline that ties everything together.

Two-phase discovery:

Phase 1 — Registry-first (fast, high confidence):
  Pull all registered businesses from Vancouver Open Data within the
  radius. These are legally confirmed to exist. Generate embeddings,
  check Google Places for phantom status, enrich with social signals.

Phase 2 — Street View scan (finds the invisible ones):
  Fetch Street View tiles, run CLIP classification + OCR. For each
  detected storefront, check if it matches a Phase 1 business (by
  proximity + name). Unmatched detections become new phantom candidates.

This two-phase approach means:
  - Registry businesses get CITY_REGISTRY evidence (strong existence proof)
  - Street View matches add STREET_VIEW evidence (visual confirmation)
  - Unmatched Street View detections are "true phantoms" — businesses we
    can see but nobody has indexed
  - Social confirmation adds soft existence signals across the board
"""

from __future__ import annotations

import logging
import math
import uuid
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business import Business, EvidenceSource, EvidenceType
from app.models.embedding import BusinessEmbedding, EmbeddingType
from app.services.confirmation import ConfirmationResult, confirm_business
from app.services.embedding import CLIPEmbeddingService, get_embedding_service
from app.services.fusion import compute_confidence_score
from app.services.registry import build_profile_text
from app.services.streetview import StorefrontCandidate, analyze_tile
from app.services.streetview_fetcher import fetch_area_tiles, TileFetch
from app.services.vancouver_data import RegistryBusiness, fetch_businesses_near

log = logging.getLogger(__name__)


@dataclass
class DiscoveredBusiness:
    name: str
    latitude: float
    longitude: float
    category: str | None
    tags: list[str]
    is_phantom: bool
    source_types: list[str]
    confidence: float
    business_id: uuid.UUID | None = None


@dataclass
class DiscoveryResult:
    center_lat: float
    center_lng: float
    radius_m: float
    registry_count: int = 0
    streetview_tiles_fetched: int = 0
    streetview_storefronts: int = 0
    streetview_new_phantoms: int = 0
    total_businesses: int = 0
    phantom_count: int = 0
    discovered: list[DiscoveredBusiness] = field(default_factory=list)


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in metres between two points."""
    R = 6_371_000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def discover_area(
    center_lat: float,
    center_lng: float,
    radius_m: float,
    step_m: float = 50.0,
    db: AsyncSession | None = None,
    embedder: CLIPEmbeddingService | None = None,
    skip_streetview: bool = False,
    skip_social: bool = False,
) -> DiscoveryResult:
    """Run full two-phase discovery for a circular area."""

    if embedder is None:
        embedder = get_embedding_service()

    result = DiscoveryResult(
        center_lat=center_lat,
        center_lng=center_lng,
        radius_m=radius_m,
    )

    # ── Phase 1: Registry pull ──────────────────────────────────
    log.info("Phase 1: Fetching Vancouver registry data for (%s,%s) r=%sm",
             center_lat, center_lng, radius_m)

    registry_businesses = await fetch_businesses_near(
        lat=center_lat, lng=center_lng, radius_m=radius_m, limit=500
    )
    result.registry_count = len(registry_businesses)
    log.info("Found %d registered businesses", len(registry_businesses))

    # Process each registry business
    persisted_coords: list[tuple[float, float, uuid.UUID]] = []

    for reg_biz in registry_businesses:
        confirmation = ConfirmationResult(candidate_name=reg_biz.display_name)
        if not skip_social:
            confirmation = await confirm_business(
                candidate_name=reg_biz.display_name,
                lat=reg_biz.latitude,
                lng=reg_biz.longitude,
                category=reg_biz.business_type,
            )

        source_types = ["city_registry"] + confirmation.evidence_types
        has_name = bool(reg_biz.trade_name or reg_biz.legal_name)
        confidence = compute_confidence_score(
            evidence_types=source_types,
            has_ocr_name=has_name,
            category_confidence=0.9,  # registry categories are high confidence
        )

        disc = DiscoveredBusiness(
            name=reg_biz.display_name,
            latitude=reg_biz.latitude,
            longitude=reg_biz.longitude,
            category=reg_biz.business_type,
            tags=[reg_biz.business_subtype] if reg_biz.business_subtype else [],
            is_phantom=confirmation.is_phantom,
            source_types=source_types,
            confidence=confidence,
        )

        if db is not None:
            biz_id = await _persist_registry_business(
                db=db,
                reg_biz=reg_biz,
                confirmation=confirmation,
                confidence=confidence,
                embedder=embedder,
            )
            disc.business_id = biz_id
            persisted_coords.append((reg_biz.latitude, reg_biz.longitude, biz_id))

        result.discovered.append(disc)
        if confirmation.is_phantom:
            result.phantom_count += 1

    # ── Phase 2: Street View scan ───────────────────────────────
    if not skip_streetview:
        log.info("Phase 2: Scanning Street View tiles")

        tiles = await fetch_area_tiles(center_lat, center_lng, radius_m, step_m)
        result.streetview_tiles_fetched = len(tiles)
        log.info("Fetched %d Street View tiles", len(tiles))

        for tile_fetch in tiles:
            candidate = await analyze_tile(
                image=tile_fetch.image,
                latitude=tile_fetch.latitude,
                longitude=tile_fetch.longitude,
                tile_index=0,
                heading=tile_fetch.heading,
                embedder=embedder,
                run_ocr=True,
            )
            if candidate is None:
                continue

            result.streetview_storefronts += 1

            # Check if this matches an already-persisted registry business
            matched_id = _match_to_existing(
                candidate.latitude, candidate.longitude,
                candidate.name_hints, persisted_coords, registry_businesses,
                threshold_m=30.0,
            )

            if matched_id and db is not None:
                # Add Street View evidence to the existing business
                await _add_streetview_evidence(db, matched_id, candidate)
                await _add_visual_embedding(db, matched_id, candidate, embedder)
            elif db is not None:
                # New phantom — not in registry, found only via Street View
                result.streetview_new_phantoms += 1
                best_name = candidate.name_hints[0] if candidate.name_hints else ""
                confirmation = await confirm_business(
                    candidate_name=best_name,
                    lat=candidate.latitude,
                    lng=candidate.longitude,
                    category=candidate.category,
                    check_social=not skip_social,
                )

                sv_types = ["street_view"] + confirmation.evidence_types
                confidence = compute_confidence_score(
                    evidence_types=sv_types,
                    has_ocr_name=len(candidate.name_hints) > 0,
                    category_confidence=candidate.category_confidence,
                )

                biz_id = await _persist_streetview_business(
                    db=db, candidate=candidate, confirmation=confirmation,
                    confidence=confidence, embedder=embedder,
                )

                disc = DiscoveredBusiness(
                    name=best_name or f"Unknown {candidate.category}",
                    latitude=candidate.latitude,
                    longitude=candidate.longitude,
                    category=candidate.category,
                    tags=candidate.vibe_tags,
                    is_phantom=confirmation.is_phantom,
                    source_types=sv_types,
                    confidence=confidence,
                    business_id=biz_id,
                )
                result.discovered.append(disc)
                if confirmation.is_phantom:
                    result.phantom_count += 1

    result.total_businesses = len(result.discovered)

    if db is not None:
        await db.commit()

    log.info(
        "Discovery complete: %d total businesses (%d from registry, %d new from Street View, %d phantom)",
        result.total_businesses, result.registry_count,
        result.streetview_new_phantoms, result.phantom_count,
    )
    return result


def _match_to_existing(
    lat: float, lng: float, name_hints: list[str],
    persisted: list[tuple[float, float, uuid.UUID]],
    registry: list[RegistryBusiness],
    threshold_m: float = 30.0,
) -> uuid.UUID | None:
    """Match a Street View detection to an existing registry business
    by proximity. Returns the business_id if matched."""
    for reg_lat, reg_lng, biz_id in persisted:
        dist = _haversine_m(lat, lng, reg_lat, reg_lng)
        if dist <= threshold_m:
            return biz_id
    return None


# ── Persistence helpers ─────────────────────────────────────────

async def _persist_registry_business(
    db: AsyncSession,
    reg_biz: RegistryBusiness,
    confirmation: ConfirmationResult,
    confidence: float,
    embedder: CLIPEmbeddingService,
) -> uuid.UUID:
    biz = Business(
        canonical_name=reg_biz.display_name,
        normalized_address=reg_biz.address,
        latitude=reg_biz.latitude,
        longitude=reg_biz.longitude,
        primary_category=reg_biz.business_type,
        secondary_tags=[reg_biz.business_subtype] if reg_biz.business_subtype else [],
        source_confidence_score=confidence,
        evidence_summary={
            "is_phantom": confirmation.is_phantom,
            "registry_licence_rsn": reg_biz.licence_rsn,
            "registry_status": reg_biz.status,
            "confirmation_sources": confirmation.sources_found,
        },
    )
    db.add(biz)
    await db.flush()

    # City registry evidence
    db.add(EvidenceSource(
        business_id=biz.id,
        type=EvidenceType.CITY_REGISTRY,
        raw_reference=f"vancouver-opendata:licencersn:{reg_biz.licence_rsn}",
        features={
            "legal_name": reg_biz.legal_name,
            "trade_name": reg_biz.trade_name,
            "business_type": reg_biz.business_type,
            "business_subtype": reg_biz.business_subtype,
            "employee_count": reg_biz.employee_count,
            "local_area": reg_biz.local_area,
        },
    ))

    # Confirmation hits as evidence
    for hit in confirmation.hits:
        etype = {
            "google_places": EvidenceType.LOCAL_LISTING_API,
            "yelp": EvidenceType.LOCAL_LISTING_API,
            "tripadvisor": EvidenceType.LOCAL_LISTING_API,
            "reddit": EvidenceType.SOCIAL,
            "instagram": EvidenceType.SOCIAL,
            "tiktok": EvidenceType.SOCIAL,
            "facebook": EvidenceType.SOCIAL,
            "website": EvidenceType.WEBSITE,
        }.get(hit.source, EvidenceType.SOCIAL)

        db.add(EvidenceSource(
            business_id=biz.id,
            type=etype,
            raw_reference=hit.reference,
            features={
                "source": hit.source,
                "matched_name": hit.matched_name,
                "matched_category": hit.matched_category,
                **hit.extra,
            },
        ))

    # Text intent embedding
    profile = build_profile_text(
        name=reg_biz.display_name,
        category=reg_biz.business_type,
        tags=[reg_biz.business_subtype] if reg_biz.business_subtype else [],
    )
    text_vec = await embedder.embed_text(profile)
    db.add(BusinessEmbedding(
        business_id=biz.id,
        embedding_type=EmbeddingType.TEXT_INTENT,
        embedding=text_vec,
    ))

    return biz.id


async def _persist_streetview_business(
    db: AsyncSession,
    candidate: StorefrontCandidate,
    confirmation: ConfirmationResult,
    confidence: float,
    embedder: CLIPEmbeddingService,
) -> uuid.UUID:
    best_name = candidate.name_hints[0] if candidate.name_hints else ""
    for hit in confirmation.hits:
        if hit.matched_name:
            best_name = hit.matched_name
            break
    display_name = best_name or f"Unknown {candidate.category}"

    address = None
    for hit in confirmation.hits:
        addr = hit.extra.get("address")
        if addr:
            address = addr
            break

    biz = Business(
        canonical_name=display_name,
        normalized_address=address,
        latitude=candidate.latitude,
        longitude=candidate.longitude,
        primary_category=candidate.category,
        secondary_tags=candidate.vibe_tags,
        source_confidence_score=confidence,
        evidence_summary={
            "is_phantom": confirmation.is_phantom,
            "category_confidence": candidate.category_confidence,
            "ocr_name_hints": candidate.name_hints,
            "confirmation_sources": confirmation.sources_found,
        },
    )
    db.add(biz)
    await db.flush()

    await _add_streetview_evidence(db, biz.id, candidate)
    await _add_visual_embedding(db, biz.id, candidate, embedder)

    for hit in confirmation.hits:
        etype = {
            "google_places": EvidenceType.LOCAL_LISTING_API,
            "yelp": EvidenceType.LOCAL_LISTING_API,
            "tripadvisor": EvidenceType.LOCAL_LISTING_API,
            "reddit": EvidenceType.SOCIAL,
            "instagram": EvidenceType.SOCIAL,
            "tiktok": EvidenceType.SOCIAL,
            "facebook": EvidenceType.SOCIAL,
            "website": EvidenceType.WEBSITE,
        }.get(hit.source, EvidenceType.SOCIAL)

        db.add(EvidenceSource(
            business_id=biz.id,
            type=etype,
            raw_reference=hit.reference,
            features={"source": hit.source, "matched_name": hit.matched_name, **hit.extra},
        ))

    profile = build_profile_text(
        name=display_name,
        category=candidate.category,
        tags=candidate.vibe_tags,
    )
    text_vec = await embedder.embed_text(profile)
    db.add(BusinessEmbedding(
        business_id=biz.id,
        embedding_type=EmbeddingType.TEXT_INTENT,
        embedding=text_vec,
    ))

    return biz.id


async def _add_streetview_evidence(
    db: AsyncSession, business_id: uuid.UUID, candidate: StorefrontCandidate
) -> None:
    db.add(EvidenceSource(
        business_id=business_id,
        type=EvidenceType.STREET_VIEW,
        raw_reference=f"streetview://{candidate.latitude},{candidate.longitude}?heading={candidate.heading}",
        features={
            "category": candidate.category,
            "category_confidence": candidate.category_confidence,
            "vibe_tags": candidate.vibe_tags,
            "vibe_scores": candidate.vibe_scores,
            "name_hints": candidate.name_hints,
        },
    ))


async def _add_visual_embedding(
    db: AsyncSession, business_id: uuid.UUID,
    candidate: StorefrontCandidate, embedder: CLIPEmbeddingService,
) -> None:
    db.add(BusinessEmbedding(
        business_id=business_id,
        embedding_type=EmbeddingType.VISUAL_VIBE,
        embedding=candidate.visual_embedding,
    ))
