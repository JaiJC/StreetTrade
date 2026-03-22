"""Fetch street-level imagery from Google Street View Static API.

Given a centre coordinate and radius, generates a grid of sample points
and fetches image tiles at multiple headings for each point.

API docs: https://developers.google.com/maps/documentation/streetview
Free tier: $200/month credit covers ~28,000 tile requests.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import httpx
from PIL import Image
import io

from app.config import settings

STREETVIEW_BASE = "https://maps.googleapis.com/maps/api/streetview"
STREETVIEW_META = "https://maps.googleapis.com/maps/api/streetview/metadata"

# Four cardinal directions — good coverage of an intersection
DEFAULT_HEADINGS = [0.0, 90.0, 180.0, 270.0]


@dataclass
class TileFetch:
    image: Image.Image
    latitude: float
    longitude: float
    heading: float


def generate_sample_points(
    center_lat: float,
    center_lng: float,
    radius_m: float,
    step_m: float = 50.0,
) -> list[tuple[float, float]]:
    """Generate a grid of (lat, lng) points within a circle.

    Uses equirectangular approximation — accurate enough for radii < 10km.
    """
    lat_deg_per_m = 1.0 / 111_320.0
    lng_deg_per_m = 1.0 / (111_320.0 * math.cos(math.radians(center_lat)))

    points: list[tuple[float, float]] = []
    steps = int(radius_m / step_m)

    for dy in range(-steps, steps + 1):
        for dx in range(-steps, steps + 1):
            offset_m = math.sqrt((dy * step_m) ** 2 + (dx * step_m) ** 2)
            if offset_m > radius_m:
                continue
            lat = center_lat + dy * step_m * lat_deg_per_m
            lng = center_lng + dx * step_m * lng_deg_per_m
            points.append((lat, lng))

    return points


async def check_streetview_coverage(
    lat: float, lng: float, client: httpx.AsyncClient
) -> bool:
    """Check if Google has Street View imagery at this coordinate."""
    resp = await client.get(
        STREETVIEW_META,
        params={
            "location": f"{lat},{lng}",
            "key": settings.google_maps_api_key,
        },
    )
    if resp.status_code != 200:
        return False
    data = resp.json()
    return data.get("status") == "OK"


async def fetch_tile(
    lat: float,
    lng: float,
    heading: float,
    client: httpx.AsyncClient,
) -> Image.Image | None:
    """Fetch a single Street View tile. Returns None on failure."""
    resp = await client.get(
        STREETVIEW_BASE,
        params={
            "size": settings.streetview_tile_size,
            "location": f"{lat},{lng}",
            "heading": str(heading),
            "pitch": str(settings.streetview_pitch),
            "fov": str(settings.streetview_fov),
            "key": settings.google_maps_api_key,
        },
    )
    if resp.status_code != 200:
        return None
    try:
        return Image.open(io.BytesIO(resp.content)).convert("RGB")
    except Exception:
        return None


async def fetch_location_tiles(
    lat: float,
    lng: float,
    headings: list[float] | None = None,
    client: httpx.AsyncClient | None = None,
) -> list[TileFetch]:
    """Fetch tiles at multiple headings for a single location."""
    _headings = headings or DEFAULT_HEADINGS
    _own_client = client is None

    if _own_client:
        client = httpx.AsyncClient(timeout=15.0)

    try:
        results: list[TileFetch] = []
        for h in _headings:
            img = await fetch_tile(lat, lng, h, client)
            if img is not None:
                results.append(TileFetch(image=img, latitude=lat, longitude=lng, heading=h))
        return results
    finally:
        if _own_client:
            await client.aclose()


async def fetch_area_tiles(
    center_lat: float,
    center_lng: float,
    radius_m: float,
    step_m: float = 50.0,
    headings: list[float] | None = None,
) -> list[TileFetch]:
    """Fetch Street View tiles for all sample points in an area.

    Returns a flat list of TileFetch results for every point that has
    Street View coverage.
    """
    points = generate_sample_points(center_lat, center_lng, radius_m, step_m)
    all_tiles: list[TileFetch] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        for lat, lng in points:
            has_coverage = await check_streetview_coverage(lat, lng, client)
            if not has_coverage:
                continue
            tiles = await fetch_location_tiles(lat, lng, headings, client)
            all_tiles.extend(tiles)

    return all_tiles
