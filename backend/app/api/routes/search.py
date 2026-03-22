from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DB, Embedder
from app.models.business import EvidenceSource, EvidenceType
from app.models.embedding import EmbeddingType
from app.models.search_log import SearchQueryLog
from app.schemas.search import (
    EvidenceSignal,
    SearchRequest,
    SearchResponse,
    SearchResultItem,
    WhyExplanation,
)
from app.services.ranking import (
    HYBRID_SEARCH_SQL,
    W_CONFIDENCE,
    W_DISTANCE,
    W_SIMILARITY,
)

router = APIRouter()


def _build_why(
    evidence: list[EvidenceSignal],
    secondary_tags: list[str] | None,
    query_tokens: set[str],
) -> WhyExplanation:
    types_present = {e.type for e in evidence}

    matching_tags = []
    if secondary_tags:
        for tag in secondary_tags:
            if any(tok in tag.lower() for tok in query_tokens):
                matching_tags.append(tag)

    return WhyExplanation(
        matching_tags=matching_tags,
        has_visual_evidence=EvidenceType.STREET_VIEW in types_present,
        has_social_signal=EvidenceType.SOCIAL in types_present,
        has_registry_record=EvidenceType.CITY_REGISTRY in types_present,
        is_listed_online=EvidenceType.LOCAL_LISTING_API in types_present,
        evidence_type_count=len(types_present),
    )


@router.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest, db: DB, embedder: Embedder) -> SearchResponse:
    query_embedding = await embedder.embed_text(req.query_text)

    radius_m = req.radius_km * 1000.0

    rows = (
        await db.execute(
            HYBRID_SEARCH_SQL,
            {
                "query_embedding": str(query_embedding),
                "lat": req.latitude,
                "lng": req.longitude,
                "radius_m": radius_m,
                "result_limit": req.limit,
                "embedding_type": EmbeddingType.TEXT_INTENT.value,
                "w_sim": W_SIMILARITY,
                "w_dist": W_DISTANCE,
                "w_conf": W_CONFIDENCE,
            },
        )
    ).fetchall()

    business_ids = [row.business_id for row in rows]

    evidence_map: dict[uuid.UUID, list[EvidenceSignal]] = {}
    if business_ids:
        ev_rows = (
            await db.execute(
                select(EvidenceSource).where(
                    EvidenceSource.business_id.in_(business_ids)
                )
            )
        ).scalars().all()
        for ev in ev_rows:
            evidence_map.setdefault(ev.business_id, []).append(
                EvidenceSignal(
                    type=ev.type,
                    raw_reference=ev.raw_reference,
                    features=ev.features,
                )
            )

    query_tokens = {t.lower() for t in req.query_text.split() if len(t) > 2}

    results = []
    for row in rows:
        signals = evidence_map.get(row.business_id, [])
        is_phantom = not any(
            s.type == EvidenceType.LOCAL_LISTING_API for s in signals
        )
        why = _build_why(signals, row.secondary_tags, query_tokens)

        results.append(
            SearchResultItem(
                business_id=row.business_id,
                canonical_name=row.canonical_name,
                normalized_address=row.normalized_address,
                latitude=row.latitude,
                longitude=row.longitude,
                primary_category=row.primary_category,
                secondary_tags=row.secondary_tags or [],
                source_confidence_score=row.source_confidence_score,
                distance_m=row.distance_m,
                similarity=row.similarity,
                hybrid_score=row.hybrid_score,
                is_phantom=is_phantom,
                why=why,
                evidence_signals=signals,
            )
        )

    log_entry = SearchQueryLog(
        raw_query_text=req.query_text,
        latitude=req.latitude,
        longitude=req.longitude,
        radius_km=req.radius_km,
        limit=req.limit,
        query_embedding=query_embedding,
        top_results={
            "ids": [str(r.business_id) for r in results[:10]],
            "scores": [r.hybrid_score for r in results[:10]],
        },
        result_count=len(results),
    )
    db.add(log_entry)
    await db.commit()

    return SearchResponse(
        query_text=req.query_text,
        latitude=req.latitude,
        longitude=req.longitude,
        radius_km=req.radius_km,
        result_count=len(results),
        results=results,
        searched_at=datetime.now(timezone.utc),
    )
