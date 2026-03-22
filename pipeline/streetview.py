from __future__ import annotations

import math
import os
from typing import TypedDict

import requests


class ImageResult(TypedDict):
    image_url: str
    lat: float
    lng: float
    heading: int
    source: str


def _build_bbox(lat: float, lng: float, radius_km: float) -> tuple[float, float, float, float]:
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * max(math.cos(math.radians(lat)), 0.1))
    return (lng - lng_delta, lat - lat_delta, lng + lng_delta, lat + lat_delta)


def fetch_street_view_images(lat: float, lng: float, radius_km: float) -> list[ImageResult]:
    google_api_key = os.getenv("GOOGLE_STREETVIEW_API_KEY")
    if google_api_key:
        headings = [0, 90, 180, 270]
        points = [
            (lat, lng),
            (lat + (radius_km / 222.0), lng),
            (lat - (radius_km / 222.0), lng),
            (lat, lng + (radius_km / (222.0 * max(math.cos(math.radians(lat)), 0.1)))),
            (lat, lng - (radius_km / (222.0 * max(math.cos(math.radians(lat)), 0.1)))),
        ]
        results: list[ImageResult] = []
        for p_lat, p_lng in points:
            for heading in headings:
                results.append(
                    {
                        "image_url": (
                            "https://maps.googleapis.com/maps/api/streetview"
                            f"?size=640x640&location={p_lat},{p_lng}&fov=90"
                            f"&heading={heading}&key={google_api_key}"
                        ),
                        "lat": p_lat,
                        "lng": p_lng,
                        "heading": heading,
                        "source": "streetview",
                    }
                )
        return results

    mapillary_token = os.getenv("MAPILLARY_ACCESS_TOKEN")
    if not mapillary_token:
        return []

    min_lng, min_lat, max_lng, max_lat = _build_bbox(lat, lng, radius_km)
    response = requests.get(
        "https://graph.mapillary.com/images",
        params={
            "fields": "id,thumb_1024_url,computed_geometry",
            "bbox": f"{min_lng},{min_lat},{max_lng},{max_lat}",
            "access_token": mapillary_token,
            "limit": 25,
        },
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    data = payload.get("data", [])

    results: list[ImageResult] = []
    for item in data:
        geometry = item.get("computed_geometry", {})
        coordinates = geometry.get("coordinates", [lng, lat])
        results.append(
            {
                "image_url": item.get("thumb_1024_url", ""),
                "lat": float(coordinates[1]) if len(coordinates) > 1 else lat,
                "lng": float(coordinates[0]) if coordinates else lng,
                "heading": 0,
                "source": "mapillary",
            }
        )
    return [r for r in results if r["image_url"]]
