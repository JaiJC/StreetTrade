from __future__ import annotations

import json
import math
import os
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, TypedDict

import requests

ROOT_DIR = Path(__file__).resolve().parents[1]
OVERTURE_SAMPLE_PATH = ROOT_DIR / "data" / "overture_sample.geojson"


class EnrichmentResult(TypedDict):
    found_on_yelp: bool
    found_on_foursquare: bool
    found_on_overture: bool
    already_on_google: bool
    enriched_address: str | None
    enriched_hours: str | None


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_earth_m = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lng / 2) ** 2
    )
    return 2 * radius_earth_m * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _name_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def _check_overture(name: str, lat: float, lng: float) -> tuple[bool, str | None]:
    if not OVERTURE_SAMPLE_PATH.exists():
        return (False, None)

    with OVERTURE_SAMPLE_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    for feature in features:
        props = feature.get("properties", {})
        geometry = feature.get("geometry", {})
        coords = geometry.get("coordinates", [])
        if len(coords) < 2:
            continue

        feature_lng, feature_lat = float(coords[0]), float(coords[1])
        distance_m = _haversine_m(lat, lng, feature_lat, feature_lng)
        similarity = _name_similarity(name, str(props.get("name", "")))
        if distance_m <= 50 and similarity >= 0.7:
            return (True, props.get("address") or props.get("name"))
    return (False, None)


def _check_yelp(name: str, lat: float, lng: float) -> tuple[bool, str | None]:
    api_key = os.getenv("YELP_API_KEY")
    if not api_key:
        return (False, None)

    response = requests.get(
        "https://api.yelp.com/v3/businesses/search",
        headers={"Authorization": f"Bearer {api_key}"},
        params={
            "term": name,
            "latitude": lat,
            "longitude": lng,
            "radius": 50,
            "limit": 3,
        },
        timeout=20,
    )
    response.raise_for_status()
    businesses = response.json().get("businesses", [])
    if businesses:
        location = businesses[0].get("location", {})
        display_address = location.get("display_address", [])
        return (True, ", ".join(display_address) if display_address else businesses[0].get("name"))
    return (False, None)


def _check_foursquare(name: str, lat: float, lng: float) -> tuple[bool, str | None]:
    api_key = os.getenv("FOURSQUARE_API_KEY")
    if not api_key:
        return (False, None)

    response = requests.get(
        "https://api.foursquare.com/v3/places/search",
        headers={"Authorization": api_key, "Accept": "application/json"},
        params={
            "query": name,
            "ll": f"{lat},{lng}",
            "radius": 50,
            "limit": 3,
        },
        timeout=20,
    )
    response.raise_for_status()
    results = response.json().get("results", [])
    if results:
        location = results[0].get("location", {})
        return (True, location.get("formatted_address") or results[0].get("name"))
    return (False, None)


def cross_reference_business(name: str, lat: float, lng: float) -> EnrichmentResult:
    found_on_overture, overture_address = _check_overture(name=name, lat=lat, lng=lng)

    try:
        found_on_yelp, yelp_address = _check_yelp(name=name, lat=lat, lng=lng)
    except Exception:  # noqa: BLE001
        found_on_yelp, yelp_address = (False, None)

    try:
        found_on_foursquare, fsq_address = _check_foursquare(name=name, lat=lat, lng=lng)
    except Exception:  # noqa: BLE001
        found_on_foursquare, fsq_address = (False, None)

    enriched_address = yelp_address or fsq_address or overture_address
    already_on_google = found_on_yelp or found_on_foursquare

    return {
        "found_on_yelp": found_on_yelp,
        "found_on_foursquare": found_on_foursquare,
        "found_on_overture": found_on_overture,
        "already_on_google": already_on_google,
        "enriched_address": enriched_address,
        "enriched_hours": None,
    }
