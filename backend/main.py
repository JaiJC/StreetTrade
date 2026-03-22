import json
import math
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import BusinessListResponse, BusinessModel, BusinessOut, CategoryCount
from seed import seed_db


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    seed_db(db)
    db.close()
    yield


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="StreetTrade API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.asin(math.sqrt(a))


def to_business_out(biz: BusinessModel) -> dict:
    return {
        "id": biz.id,
        "name": biz.name,
        "category": biz.category,
        "description": biz.description,
        "address": biz.address,
        "lat": biz.lat,
        "lng": biz.lng,
        "confidence": biz.confidence,
        "source": biz.source,
        "onGoogle": biz.on_google,
        "imageUrl": biz.image_url,
        "tags": json.loads(biz.tags) if isinstance(biz.tags, str) else biz.tags,
        "discoveredAt": biz.discovered_at,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/search", response_model=BusinessListResponse)
def search_businesses(
    q: str = "",
    category: Optional[str] = None,
    source: Optional[str] = None,
    confidence_min: Optional[float] = None,
    exclusive_only: bool = False,
    sort_by: str = "relevance",
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = None,
    db: Session = Depends(get_db),
):
    query = db.query(BusinessModel)

    # SQL-level filters
    if category and category != "all":
        query = query.filter(BusinessModel.category == category)
    if source and source != "all":
        query = query.filter(BusinessModel.source == source)
    if confidence_min is not None:
        query = query.filter(BusinessModel.confidence >= confidence_min)
    if exclusive_only:
        query = query.filter(BusinessModel.on_google == False)

    results = query.all()

    # Text search (Python-level for simplicity with JSON tags)
    if q.strip():
        q_lower = q.lower()
        filtered = []
        for biz in results:
            tags = json.loads(biz.tags) if isinstance(biz.tags, str) else biz.tags
            if (
                q_lower in biz.name.lower()
                or q_lower in biz.description.lower()
                or q_lower in biz.category.lower()
                or any(q_lower in t.lower() for t in tags)
            ):
                filtered.append(biz)
        results = filtered

    # Geo filter
    if lat is not None and lng is not None and radius is not None:
        results = [
            biz
            for biz in results
            if haversine_km(lat, lng, biz.lat, biz.lng) <= radius
        ]

    # Sort
    if sort_by == "confidence":
        results.sort(key=lambda b: b.confidence, reverse=True)
    elif sort_by == "name":
        results.sort(key=lambda b: b.name.lower())
    else:
        results.sort(key=lambda b: b.confidence, reverse=True)

    businesses = [to_business_out(biz) for biz in results]
    return {"businesses": businesses, "total": len(businesses)}


@app.get("/api/businesses/{business_id}", response_model=BusinessOut)
def get_business(business_id: str, db: Session = Depends(get_db)):
    biz = db.query(BusinessModel).filter(BusinessModel.id == business_id).first()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    return to_business_out(biz)


@app.get("/api/categories", response_model=list[CategoryCount])
def get_categories(db: Session = Depends(get_db)):
    rows = (
        db.query(BusinessModel.category, func.count(BusinessModel.id))
        .group_by(BusinessModel.category)
        .order_by(func.count(BusinessModel.id).desc())
        .all()
    )
    return [{"category": cat, "count": cnt} for cat, cnt in rows]
