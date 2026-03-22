"""Social media signal pipeline.

Processes public, geo-tagged social posts (Instagram, TikTok) near a
location into vibe embeddings and popularity indicators.

For the hackathon this pipeline defines a clean interface that can
accept real social data when available. The data source itself (API
client or scraper) is external — this module only handles feature
extraction and embedding once the posts are provided.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime

from app.services.embedding import CLIPEmbeddingService


@dataclass
class SocialPost:
    """Raw social post data (input to pipeline)."""
    caption: str
    hashtags: list[str]
    latitude: float
    longitude: float
    posted_at: datetime
    image_url: str | None = None
    platform: str = "instagram"


@dataclass
class SocialSignal:
    """Aggregated social signal for a geocell or business (output)."""
    latitude: float
    longitude: float
    vibe_tags: list[str]
    social_embedding: list[float]
    post_count: int
    last_post_date: datetime
    sample_captions: list[str] = field(default_factory=list)


def extract_vibe_tokens(caption: str, hashtags: list[str]) -> str:
    """Extract the vibe-relevant text from a social post for embedding."""
    clean_caption = re.sub(r"@\w+", "", caption)
    clean_caption = re.sub(r"https?://\S+", "", clean_caption).strip()
    tag_text = " ".join(f"#{h}" for h in hashtags[:10])
    return f"{clean_caption} {tag_text}".strip()


async def process_social_posts(
    posts: list[SocialPost],
    embedder: CLIPEmbeddingService | None = None,
) -> SocialSignal | None:
    """Aggregate a cluster of posts near the same location into a
    single social signal with a vibe embedding."""

    if not posts:
        return None

    if embedder is None:
        from app.services.embedding import get_embedding_service
        embedder = get_embedding_service()

    vibe_texts = [extract_vibe_tokens(p.caption, p.hashtags) for p in posts]
    vibe_texts = [t for t in vibe_texts if len(t) > 5]

    if not vibe_texts:
        return None

    embeddings = await embedder.embed_texts(vibe_texts)

    avg_embedding = [
        sum(col) / len(col) for col in zip(*embeddings)
    ]
    norm = sum(x * x for x in avg_embedding) ** 0.5
    if norm > 0:
        avg_embedding = [x / norm for x in avg_embedding]

    all_hashtags = []
    for p in posts:
        all_hashtags.extend(p.hashtags)
    tag_counts: dict[str, int] = {}
    for tag in all_hashtags:
        tag_counts[tag.lower()] = tag_counts.get(tag.lower(), 0) + 1
    top_tags = sorted(tag_counts, key=tag_counts.get, reverse=True)[:10]

    avg_lat = sum(p.latitude for p in posts) / len(posts)
    avg_lng = sum(p.longitude for p in posts) / len(posts)
    last_date = max(p.posted_at for p in posts)

    return SocialSignal(
        latitude=avg_lat,
        longitude=avg_lng,
        vibe_tags=top_tags,
        social_embedding=avg_embedding,
        post_count=len(posts),
        last_post_date=last_date,
        sample_captions=[p.caption[:100] for p in posts[:3]],
    )
