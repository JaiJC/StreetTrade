-- StreetTrade: initial schema
-- Requires: PostgreSQL 15+ with pgvector extension

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Enums
CREATE TYPE evidence_type_enum AS ENUM (
    'street_view',
    'city_registry',
    'local_listing_api',
    'website',
    'social'
);

CREATE TYPE embedding_type_enum AS ENUM (
    'text_intent',
    'visual_vibe',
    'social_vibe'
);

-- Business: the core entity
CREATE TABLE business (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name  TEXT NOT NULL,
    normalized_address TEXT,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    primary_category VARCHAR(100),
    secondary_tags  TEXT[],
    source_confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    evidence_summary JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_business_lat CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_business_lng CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT ck_business_confidence CHECK (source_confidence_score BETWEEN 0 AND 1)
);

CREATE INDEX ix_business_category ON business (primary_category);
CREATE INDEX ix_business_location ON business (latitude, longitude);

-- GiST index for earthdistance bounding-box checks
CREATE INDEX ix_business_earth ON business
    USING gist (ll_to_earth(latitude, longitude));

-- Evidence sources: one business can have many
CREATE TABLE evidence_source (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id     UUID NOT NULL REFERENCES business(id) ON DELETE CASCADE,
    type            evidence_type_enum NOT NULL,
    raw_reference   TEXT NOT NULL,
    features        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_evidence_business ON evidence_source (business_id);
CREATE INDEX ix_evidence_type ON evidence_source (type);

-- GIN index on features JSONB for flexible querying
CREATE INDEX ix_evidence_features ON evidence_source USING gin (features);

-- Embeddings: per-business, per-type (text_intent, visual_vibe, social_vibe)
CREATE TABLE business_embedding (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id     UUID NOT NULL REFERENCES business(id) ON DELETE CASCADE,
    embedding_type  embedding_type_enum NOT NULL,
    embedding       vector(512) NOT NULL,
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_business_embedding_type UNIQUE (business_id, embedding_type)
);

CREATE INDEX ix_embedding_business ON business_embedding (business_id);

-- IVFFlat index for approximate nearest-neighbour search on embeddings.
-- NOTE: IVFFlat requires data to exist before building. For initial load,
-- create this index AFTER inserting the first batch of embeddings.
-- With <1000 rows, a flat scan is fine; create this once you cross ~1k rows.
--
-- CREATE INDEX ix_embedding_vector ON business_embedding
--     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
--
-- For small datasets, an exact HNSW index works better:
CREATE INDEX ix_embedding_hnsw ON business_embedding
    USING hnsw (embedding vector_cosine_ops);

-- Search query log: analytics and debugging
CREATE TABLE search_query_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_query_text  TEXT NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    radius_km       DOUBLE PRECISION NOT NULL,
    "limit"         INTEGER DEFAULT 20,
    query_embedding vector(512),
    top_results     JSONB,
    result_count    INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- Example: hybrid query — filter by distance, rank by similarity
-- ============================================================
-- Parameters:
--   $1 = query embedding (vector)
--   $2 = user latitude
--   $3 = user longitude
--   $4 = radius in metres
--   $5 = result limit
--
-- SELECT
--     b.id,
--     b.canonical_name,
--     b.primary_category,
--     b.secondary_tags,
--     b.source_confidence_score,
--     b.evidence_summary,
--     earth_distance(
--         ll_to_earth(b.latitude, b.longitude),
--         ll_to_earth($2, $3)
--     ) AS distance_m,
--     1 - (be.embedding <=> $1) AS similarity,
--     -- Hybrid score: weighted blend of similarity, proximity, and confidence
--     (
--         0.55 * (1 - (be.embedding <=> $1))                           -- semantic similarity
--       + 0.25 * (1 - LEAST(earth_distance(
--                         ll_to_earth(b.latitude, b.longitude),
--                         ll_to_earth($2, $3)
--                     ) / $4, 1.0))                                     -- proximity (closer = higher)
--       + 0.20 * b.source_confidence_score                             -- evidence confidence
--     ) AS hybrid_score
-- FROM business b
-- JOIN business_embedding be ON be.business_id = b.id
-- WHERE
--     be.embedding_type = 'text_intent'
--     AND earth_box(ll_to_earth($2, $3), $4)
--         @> ll_to_earth(b.latitude, b.longitude)
-- ORDER BY hybrid_score DESC
-- LIMIT $5;
