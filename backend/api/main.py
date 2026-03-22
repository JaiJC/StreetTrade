from __future__ import annotations

import json
import math
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from pipeline.analyze import analyze_storefront, analyze_uploaded_storefront
from pipeline.classify import normalize_category, score_confidence
from pipeline.enrich import cross_reference_business
from pipeline.streetview import fetch_street_view_images

DB_PATH = Path(os.getenv("SQLITE_DB_PATH", ROOT_DIR / "data" / "streettrade.db"))
MOCK_DATA_PATH = ROOT_DIR / "data" / "mock_businesses.json"


class Business(BaseModel):
    id: str
    name: str
    category: str
    lat: float
    lng: float
    address: str
    confidence: float = Field(ge=0.0, le=1.0)
    source: str
    already_on_google: bool
    image_url: str | None = None
    discovered_at: datetime


class DiscoverRequest(BaseModel):
    lat: float
    lng: float
    radius_km: float = 1.0


app = FastAPI(title="StreetTrade API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

discovery_jobs: dict[str, dict[str, Any]] = {}


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS businesses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                address TEXT NOT NULL,
                confidence REAL NOT NULL,
                source TEXT NOT NULL,
                already_on_google INTEGER NOT NULL,
                image_url TEXT,
                discovered_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


@app.on_event("startup")
def startup() -> None:
    init_db()


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_earth_km = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_earth_km * c


def row_to_business(row: sqlite3.Row) -> Business:
    return Business(
        id=row["id"],
        name=row["name"],
        category=row["category"],
        lat=row["lat"],
        lng=row["lng"],
        address=row["address"],
        confidence=row["confidence"],
        source=row["source"],
        already_on_google=bool(row["already_on_google"]),
        image_url=row["image_url"],
        discovered_at=datetime.fromisoformat(row["discovered_at"]),
    )


def get_all_businesses() -> list[Business]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM businesses ORDER BY datetime(discovered_at) DESC"
        ).fetchall()
    return [row_to_business(row) for row in rows]


def load_mock_businesses() -> list[Business]:
    if not MOCK_DATA_PATH.exists():
        return []
    with MOCK_DATA_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return [Business(**item) for item in data]


def save_business(business: Business) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO businesses (
                id, name, category, lat, lng, address, confidence, source,
                already_on_google, image_url, discovered_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                business.id,
                business.name,
                business.category,
                business.lat,
                business.lng,
                business.address,
                business.confidence,
                business.source,
                int(business.already_on_google),
                business.image_url,
                business.discovered_at.isoformat(),
            ),
        )
        conn.commit()


def update_job(job_id: str, status: str, progress: int, message: str = "") -> None:
    discovery_jobs[job_id] = {
        "job_id": job_id,
        "status": status,
        "progress": progress,
        "message": message,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def ocr_quality_score(raw_ocr_text: str) -> float:
    text_length = len(raw_ocr_text.strip())
    return max(0.0, min(1.0, text_length / 100.0))


def run_discovery_job(job_id: str, lat: float, lng: float, radius_km: float) -> None:
    try:
        update_job(job_id, "running", 10, "Fetching imagery")
        images = fetch_street_view_images(lat=lat, lng=lng, radius_km=radius_km)
        if not images:
            images = [
                {
                    "image_url": f"https://maps.googleapis.com/maps/api/streetview?size=640x640&location={lat},{lng}&fov=90&heading=0",
                    "lat": lat,
                    "lng": lng,
                    "heading": 0,
                    "source": "streetview",
                }
            ]

        update_job(job_id, "running", 25, "Analyzing storefronts")
        total_images = max(len(images), 1)
        discovered_count = 0

        for index, image in enumerate(images, start=1):
            analysis = analyze_storefront(str(image["image_url"]))
            if not analysis.get("is_storefront", False):
                continue

            name = analysis.get("business_name") or f"Unnamed Storefront {index}"
            normalized_category = normalize_category(str(analysis.get("category") or "other"))
            enrichment = cross_reference_business(
                name=name,
                lat=float(image["lat"]),
                lng=float(image["lng"]),
            )

            confidence = score_confidence(
                vlm_confidence=float(analysis.get("confidence", 0.6)),
                ocr_text_quality=ocr_quality_score(str(analysis.get("raw_ocr_text", ""))),
                cross_reference_match=(
                    enrichment.get("found_on_overture", False)
                    or enrichment.get("found_on_yelp", False)
                    or enrichment.get("found_on_foursquare", False)
                ),
            )

            business = Business(
                id=str(uuid.uuid4()),
                name=name,
                category=normalized_category,
                lat=float(image["lat"]),
                lng=float(image["lng"]),
                address=str(enrichment.get("enriched_address") or f"{lat:.5f}, {lng:.5f}"),
                confidence=confidence,
                source=str(image["source"]),
                already_on_google=bool(enrichment.get("already_on_google", False)),
                image_url=str(image["image_url"]),
                discovered_at=datetime.now(timezone.utc),
            )
            save_business(business)
            discovered_count += 1

            progress = 25 + int((index / total_images) * 70)
            update_job(
                job_id,
                "running",
                min(progress, 95),
                f"Processed {index}/{total_images} images",
            )

        update_job(
            job_id,
            "completed",
            100,
            f"Discovery completed. Saved {discovered_count} businesses.",
        )
    except Exception as exc:  # noqa: BLE001
        update_job(job_id, "failed", 100, f"Discovery failed: {exc}")


@app.get("/api/search", response_model=list[Business])
def search_businesses(
    query: str = Query(default="", description="Search term"),
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius_km: float = Query(default=1.0, ge=0.1, le=25.0),
) -> list[Business]:
    businesses = get_all_businesses()
    if not businesses:
        businesses = load_mock_businesses()

    needle = query.strip().lower()
    filtered: list[tuple[float, Business]] = []

    for business in businesses:
        haystack = f"{business.name} {business.category} {business.address}".lower()
        if needle and needle not in haystack:
            continue
        distance_km = haversine_km(lat, lng, business.lat, business.lng)
        if distance_km <= radius_km:
            filtered.append((distance_km, business))

    filtered.sort(key=lambda pair: pair[0])
    return [business for _, business in filtered]


@app.get("/api/businesses", response_model=list[Business])
def list_businesses() -> list[Business]:
    return get_all_businesses()


@app.post("/api/discover")
def discover_businesses(
    payload: DiscoverRequest,
    background_tasks: BackgroundTasks,
) -> dict[str, Any]:
    job_id = str(uuid.uuid4())
    update_job(job_id, "queued", 0, "Queued for processing")
    background_tasks.add_task(run_discovery_job, job_id, payload.lat, payload.lng, payload.radius_km)
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/discover/status/{job_id}")
def get_discovery_status(job_id: str) -> dict[str, Any]:
    status = discovery_jobs.get(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status


@app.post("/api/analyze-demo")
async def analyze_demo(file: UploadFile = File(...)) -> dict[str, Any]:
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    image_bytes = await file.read()
    analysis = analyze_uploaded_storefront(image_bytes=image_bytes, filename=file.filename or "uploaded image")
    if not analysis.get("business_name"):
        stem = Path(file.filename or "Uploaded storefront").stem.replace("_", " ").replace("-", " ")
        analysis["business_name"] = stem.title()
    return analysis
