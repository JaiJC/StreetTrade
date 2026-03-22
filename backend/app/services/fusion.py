"""Evidence fusion — combine per-source embeddings into business-level vectors.

Strategy: per-source embeddings combined at query time, with a pre-computed
weighted-average `text_intent` embedding as the primary search vector.

CONFIDENCE MODEL
================
Confidence answers: "How certain are we this business EXISTS and is
correctly categorized?" It has NOTHING to do with business quality,
ratings, or popularity.

Signals that increase confidence:
  - Street View detection (we can see it exists)        → base existence signal
  - OCR extracted a name (we know what it's called)     → identity signal
  - Google Places confirms it (it's indexed somewhere)  → strong verification
  - City registry lists it (government says it exists)  → strong verification
  - Social media mentions near this location            → soft verification
  - Website found for the business                      → soft verification
  - Multiple independent sources agree on category      → category certainty

A "phantom" business (no Google/Yelp listing) can still reach high
confidence through Street View + OCR + registry + social signals.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SourceEmbedding:
    embedding: list[float]
    weight: float = 1.0


def weighted_average(sources: list[SourceEmbedding]) -> list[float]:
    """Compute L2-normalized weighted average of embedding vectors."""
    if not sources:
        raise ValueError("Need at least one source embedding")

    dim = len(sources[0].embedding)
    total_weight = sum(s.weight for s in sources)
    fused = [0.0] * dim

    for src in sources:
        for i in range(dim):
            fused[i] += src.embedding[i] * (src.weight / total_weight)

    norm = sum(x * x for x in fused) ** 0.5
    if norm > 0:
        fused = [x / norm for x in fused]

    return fused


def compute_confidence_score(
    evidence_types: list[str],
    has_ocr_name: bool = False,
    category_confidence: float = 0.0,
) -> float:
    """Compute existence confidence for a candidate business.

    This is purely about "does this place exist and did we classify it
    correctly". NOT about quality.

    Returns a score in [0, 1].
    """
    unique = set(evidence_types)
    score = 0.0

    # Existence signals: did we actually see / verify this place?
    existence_weights = {
        "street_view": 0.20,        # we can see it
        "city_registry": 0.25,      # government says it exists
        "local_listing_api": 0.20,  # it's indexed on Google/Yelp
        "website": 0.10,            # it has a web presence
        "social": 0.05,             # people post about it
    }
    for t in unique:
        score += existence_weights.get(t, 0.0)

    # Identity bonus: we extracted a name from the signage
    if has_ocr_name:
        score += 0.10

    # Category confidence from CLIP (how sure are we about what it sells)
    score += 0.10 * min(category_confidence, 1.0)

    return min(score, 1.0)
