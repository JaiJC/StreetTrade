"""Business existence confirmation via multiple external sources.

After detecting a candidate business (from Street View, registry, etc.),
we cross-reference it against every available source to answer:

    "Does this business actually exist, and is our category guess right?"

NOT about quality/ratings. Confidence = existence certainty.

Sources checked (in order):
  1. Vancouver Open Data registry — city-issued business licence
  2. Google Places "Find Place" API — is it listed on Google?
  3. Reddit (r/vancouver) — do locals mention it?
  4. Social web search — Instagram, TikTok, Yelp, website presence

Each source returns a ConfirmationHit. A business is "phantom" if
it has NO listing on Google Places or similar major platforms.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

from app.config import settings

log = logging.getLogger(__name__)

PLACES_FIND = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
PLACES_NEARBY = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"


@dataclass
class ConfirmationHit:
    source: str  # "city_registry", "google_places", "reddit", "instagram", etc.
    reference: str
    matched_name: str | None = None
    matched_category: str | None = None
    extra: dict = field(default_factory=dict)


@dataclass
class ConfirmationResult:
    candidate_name: str
    hits: list[ConfirmationHit] = field(default_factory=list)
    is_phantom: bool = True

    @property
    def hit_count(self) -> int:
        return len(self.hits)

    @property
    def sources_found(self) -> list[str]:
        return [h.source for h in self.hits]

    @property
    def evidence_types(self) -> list[str]:
        """Map confirmation sources to evidence type enum values."""
        type_map = {
            "city_registry": "city_registry",
            "google_places": "local_listing_api",
            "reddit": "social",
            "instagram": "social",
            "tiktok": "social",
            "yelp": "local_listing_api",
            "facebook": "social",
            "tripadvisor": "local_listing_api",
            "website": "website",
        }
        return [type_map.get(h.source, "social") for h in self.hits]


# --- Google Places ---

async def _check_google_places(
    name: str, lat: float, lng: float, client: httpx.AsyncClient
) -> ConfirmationHit | None:
    if not settings.google_maps_api_key:
        return None

    try:
        resp = await client.get(
            PLACES_FIND,
            params={
                "input": name,
                "inputtype": "textquery",
                "locationbias": f"circle:200@{lat},{lng}",
                "fields": "place_id,name,types,formatted_address,business_status",
                "key": settings.google_maps_api_key,
            },
        )
        if resp.status_code != 200:
            return None

        candidates = resp.json().get("candidates", [])
        if not candidates:
            return None

        place = candidates[0]
        return ConfirmationHit(
            source="google_places",
            reference=f"place_id:{place.get('place_id', '')}",
            matched_name=place.get("name"),
            matched_category=", ".join(place.get("types", [])[:3]),
            extra={
                "address": place.get("formatted_address"),
                "business_status": place.get("business_status"),
            },
        )
    except Exception as e:
        log.debug("Places API error: %s", e)
        return None


async def _check_google_nearby(
    lat: float, lng: float, keyword: str | None, client: httpx.AsyncClient
) -> list[ConfirmationHit]:
    if not settings.google_maps_api_key:
        return []

    try:
        params: dict = {
            "location": f"{lat},{lng}",
            "radius": "50",
            "key": settings.google_maps_api_key,
        }
        if keyword:
            params["keyword"] = keyword

        resp = await client.get(PLACES_NEARBY, params=params)
        if resp.status_code != 200:
            return []

        hits = []
        for place in resp.json().get("results", [])[:3]:
            hits.append(ConfirmationHit(
                source="google_places",
                reference=f"place_id:{place.get('place_id', '')}",
                matched_name=place.get("name"),
                matched_category=", ".join(place.get("types", [])[:3]),
                extra={"address": place.get("vicinity")},
            ))
        return hits
    except Exception as e:
        log.debug("Places Nearby error: %s", e)
        return []


# --- Full confirmation pipeline ---

async def confirm_business(
    candidate_name: str,
    lat: float,
    lng: float,
    category: str | None = None,
    check_social: bool = True,
) -> ConfirmationResult:
    """Run all confirmation checks for a candidate business.

    Checks Google Places, Reddit, and social web presence.
    Registry check is handled separately in the discovery orchestrator
    since we bulk-fetch registry data for the whole area.
    """
    result = ConfirmationResult(candidate_name=candidate_name)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Google Places — by name if available
        if candidate_name and len(candidate_name) > 2:
            hit = await _check_google_places(candidate_name, lat, lng, client)
            if hit:
                result.hits.append(hit)
                result.is_phantom = False

        # 2. Google Places — nearby search (catches cases where OCR name is off)
        if result.is_phantom:
            nearby = await _check_google_nearby(lat, lng, category, client)
            for hit in nearby:
                result.hits.append(hit)
                result.is_phantom = False

    # 3. Reddit search
    if candidate_name and len(candidate_name) > 3:
        try:
            from app.services.reddit_search import search_reddit_for_business
            reddit_result = await search_reddit_for_business(candidate_name)
            if reddit_result.is_mentioned:
                best = reddit_result.mentions[0]
                result.hits.append(ConfirmationHit(
                    source="reddit",
                    reference=best.url,
                    matched_name=candidate_name,
                    extra={
                        "mention_count": reddit_result.total_mentions,
                        "top_post_title": best.title,
                        "top_post_score": best.score,
                    },
                ))
        except Exception as e:
            log.debug("Reddit search skipped: %s", e)

    # 4. Social web search (Instagram, TikTok, Yelp, etc.)
    if check_social and candidate_name and len(candidate_name) > 3:
        try:
            from app.services.social_search import search_social_presence
            social = await search_social_presence(candidate_name)
            for presence in social.presences:
                result.hits.append(ConfirmationHit(
                    source=presence.platform,
                    reference=presence.url,
                    matched_name=candidate_name,
                ))
        except Exception as e:
            log.debug("Social search skipped: %s", e)

    return result
