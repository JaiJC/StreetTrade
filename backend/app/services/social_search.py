"""Social media presence search — Instagram, TikTok, general web.

Lightweight checker that searches the web for a business's social
media presence. Does NOT scrape or use platform-specific APIs that
require approval. Instead uses DuckDuckGo search (free, no API key)
to find if the business has:
  - An Instagram profile or is tagged in location posts
  - TikTok presence (tagged, reviewed, or mentioned)
  - A website
  - Yelp / TripAdvisor / other listing presence

This is a "soft signal" — finding social presence increases our
confidence that the business is real and active.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import httpx

log = logging.getLogger(__name__)

DDGS_URL = "https://html.duckduckgo.com/html/"


@dataclass
class SocialPresence:
    platform: str  # "instagram", "tiktok", "yelp", "website", "tripadvisor"
    url: str
    snippet: str = ""


@dataclass
class SocialSearchResult:
    business_name: str
    city: str
    presences: list[SocialPresence] = field(default_factory=list)

    @property
    def platforms_found(self) -> list[str]:
        return list({p.platform for p in self.presences})

    @property
    def has_social(self) -> bool:
        return len(self.presences) > 0


PLATFORM_MARKERS = {
    "instagram": ["instagram.com/"],
    "tiktok": ["tiktok.com/@", "tiktok.com/discover"],
    "yelp": ["yelp.ca/biz/", "yelp.com/biz/"],
    "tripadvisor": ["tripadvisor.ca/", "tripadvisor.com/"],
    "facebook": ["facebook.com/"],
}


async def search_social_presence(
    business_name: str,
    city: str = "Vancouver",
) -> SocialSearchResult:
    """Search DuckDuckGo for a business's social media presence.

    Makes a single search query and checks the result URLs for known
    social media platforms. No API key needed.
    """
    result = SocialSearchResult(business_name=business_name, city=city)

    if not business_name or len(business_name) < 3:
        return result

    query = f"{business_name} {city}"

    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            headers={"User-Agent": "StreetTrade/0.1 (hackathon project)"},
            follow_redirects=True,
        ) as client:
            resp = await client.post(DDGS_URL, data={"q": query})

            if resp.status_code != 200:
                log.debug("DuckDuckGo returned %s", resp.status_code)
                return result

            body = resp.text.lower()

            for platform, markers in PLATFORM_MARKERS.items():
                for marker in markers:
                    idx = body.find(marker)
                    if idx != -1:
                        url_start = body.rfind("href=\"", max(0, idx - 200), idx)
                        if url_start != -1:
                            url_start += len("href=\"")
                            url_end = body.find("\"", url_start)
                            url = body[url_start:url_end] if url_end != -1 else ""
                        else:
                            url = f"https://{marker}{business_name.replace(' ', '')}"

                        result.presences.append(SocialPresence(
                            platform=platform,
                            url=url[:500],
                        ))
                        break

    except Exception as e:
        log.debug("Social search failed for '%s': %s", business_name, e)

    return result
