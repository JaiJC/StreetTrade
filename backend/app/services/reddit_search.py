"""Reddit connector — search local subreddits for business mentions.

Uses asyncpraw (async Python Reddit API Wrapper) to search city-specific
subreddits for mentions of a business. This gives us social proof that
real people know about and discuss the business.

Reddit doesn't support geo-search, so the strategy is:
  1. Search r/vancouver (or other city subreddit) for the business name.
  2. Look for mentions in relevant threads (recommendations, reviews).
  3. Extract context: what do people say about this place?

Requires a Reddit app: https://www.reddit.com/prefs/apps/
  - Create a "script" type app
  - Use client_id + client_secret for read-only access
  - Free, no rate-limit issues for our scale
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.config import settings

log = logging.getLogger(__name__)


@dataclass
class RedditMention:
    """A Reddit post or comment mentioning a business."""
    subreddit: str
    title: str
    url: str
    score: int
    snippet: str
    created_utc: float


@dataclass
class RedditSearchResult:
    business_name: str
    mentions: list[RedditMention] = field(default_factory=list)
    total_mentions: int = 0

    @property
    def is_mentioned(self) -> bool:
        return self.total_mentions > 0


async def search_reddit_for_business(
    business_name: str,
    city_subreddits: list[str] | None = None,
    limit: int = 10,
) -> RedditSearchResult:
    """Search Reddit for mentions of a business in city subreddits.

    Searches post titles and selftext for the business name.
    Returns matching posts with scores and snippets.
    """
    if not settings.reddit_client_id or not settings.reddit_client_secret:
        log.debug("Reddit credentials not configured — skipping Reddit search")
        return RedditSearchResult(business_name=business_name)

    subreddits = city_subreddits or settings.reddit_subreddits

    try:
        import asyncpraw

        reddit = asyncpraw.Reddit(
            client_id=settings.reddit_client_id,
            client_secret=settings.reddit_client_secret,
            user_agent=settings.reddit_user_agent,
        )
    except ImportError:
        log.warning("asyncpraw not installed — pip install asyncpraw")
        return RedditSearchResult(business_name=business_name)
    except Exception as e:
        log.warning("Failed to init Reddit client: %s", e)
        return RedditSearchResult(business_name=business_name)

    result = RedditSearchResult(business_name=business_name)

    try:
        for sub_name in subreddits:
            subreddit = await reddit.subreddit(sub_name)
            async for submission in subreddit.search(
                f'"{business_name}"', limit=limit, sort="relevance"
            ):
                snippet = (submission.selftext or submission.title)[:200]
                result.mentions.append(RedditMention(
                    subreddit=sub_name,
                    title=submission.title,
                    url=f"https://reddit.com{submission.permalink}",
                    score=submission.score,
                    snippet=snippet,
                    created_utc=submission.created_utc,
                ))

        result.total_mentions = len(result.mentions)
    except Exception as e:
        log.warning("Reddit search failed for '%s': %s", business_name, e)
    finally:
        await reddit.close()

    return result
