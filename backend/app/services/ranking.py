"""Hybrid ranking query builder.

Combines:
  - Semantic similarity  (pgvector cosine distance)
  - Geographic proximity  (earthdistance)
  - Evidence confidence    (source_confidence_score)

Weights are configurable; defaults tuned for neighbourhood-scale search.
"""

from __future__ import annotations

from sqlalchemy import text

HYBRID_SEARCH_SQL = text("""
SELECT
    b.id                AS business_id,
    b.canonical_name,
    b.normalized_address,
    b.latitude,
    b.longitude,
    b.primary_category,
    b.secondary_tags,
    b.source_confidence_score,
    earth_distance(
        ll_to_earth(b.latitude, b.longitude),
        ll_to_earth(:lat, :lng)
    ) AS distance_m,
    1 - (be.embedding <=> CAST(:query_embedding AS vector)) AS similarity,
    (
        :w_sim  * (1 - (be.embedding <=> CAST(:query_embedding AS vector)))
      + :w_dist * (1 - LEAST(
            earth_distance(
                ll_to_earth(b.latitude, b.longitude),
                ll_to_earth(:lat, :lng)
            ) / :radius_m, 1.0))
      + :w_conf * b.source_confidence_score
    ) AS hybrid_score
FROM business b
JOIN business_embedding be ON be.business_id = b.id
WHERE
    be.embedding_type = :embedding_type
    AND earth_box(ll_to_earth(:lat, :lng), :radius_m)
        @> ll_to_earth(b.latitude, b.longitude)
ORDER BY hybrid_score DESC
LIMIT :result_limit
""")

W_SIMILARITY = 0.55
W_DISTANCE = 0.25
W_CONFIDENCE = 0.20
