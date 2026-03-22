"""Registry / web / local-listing text pipeline.

Processes structured data from city business licence open data, local
listing APIs (Google Places, Yelp), and scraped website text into
normalized business profiles with text embeddings.

Each source provides a dict with whatever fields are available. This
pipeline normalizes them into a canonical profile and generates a
CLIP text embedding in the same vector space as visual embeddings.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.services.embedding import CLIPEmbeddingService


@dataclass
class ProcessedBusiness:
    canonical_name: str
    normalized_address: str
    latitude: float
    longitude: float
    primary_category: str | None
    secondary_tags: list[str]
    profile_text: str
    text_embedding: list[float]
    source_type: str
    raw_reference: str
    features: dict = field(default_factory=dict)


def normalize_name(raw_name: str) -> str:
    name = raw_name.strip()
    name = re.sub(r"\s+", " ", name)
    noise = ["ltd", "inc", "corp", "llc", "ltd.", "inc.", "corp."]
    tokens = name.split()
    tokens = [t for t in tokens if t.lower().rstrip(".") not in noise]
    return " ".join(tokens)


def build_profile_text(
    name: str,
    category: str | None = None,
    description: str | None = None,
    tags: list[str] | None = None,
    menu_items: list[str] | None = None,
) -> str:
    """Build a short text profile suitable for CLIP embedding.
    CLIP's text encoder has a 77-token limit, so keep it concise."""

    parts = [name]
    if category:
        parts.append(category)
    if tags:
        parts.append(", ".join(tags[:6]))
    if description:
        parts.append(description[:200])
    if menu_items:
        parts.append("serves: " + ", ".join(menu_items[:5]))
    return ". ".join(parts)


async def process_registry_entry(
    entry: dict,
    embedder: CLIPEmbeddingService,
) -> ProcessedBusiness:
    """Process a single registry/listing/web entry into a canonical
    business profile with embedding.

    Expected entry keys (all optional except name, latitude, longitude):
      name, address, latitude, longitude, category,
      description, tags, menu_items, source_type, raw_reference,
      features (dict of any structured extras like hours, price_range)
    """

    name = normalize_name(entry["name"])
    address = entry.get("address", "")
    lat = entry["latitude"]
    lng = entry["longitude"]
    category = entry.get("category")
    tags = entry.get("tags", [])
    description = entry.get("description")
    menu_items = entry.get("menu_items")
    source_type = entry.get("source_type", "city_registry")
    raw_ref = entry.get("raw_reference", "")
    features = entry.get("features", {})

    profile_text = build_profile_text(
        name=name,
        category=category,
        description=description,
        tags=tags,
        menu_items=menu_items,
    )

    text_embedding = await embedder.embed_text(profile_text)

    return ProcessedBusiness(
        canonical_name=name,
        normalized_address=address,
        latitude=lat,
        longitude=lng,
        primary_category=category,
        secondary_tags=tags,
        profile_text=profile_text,
        text_embedding=text_embedding,
        source_type=source_type,
        raw_reference=raw_ref,
        features=features,
    )


async def process_registry_batch(
    entries: list[dict],
    embedder: CLIPEmbeddingService | None = None,
) -> list[ProcessedBusiness]:
    if embedder is None:
        from app.services.embedding import get_embedding_service
        embedder = get_embedding_service()

    results = []
    for entry in entries:
        processed = await process_registry_entry(entry, embedder)
        results.append(processed)
    return results
