from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import DB
from app.models.business import Business
from app.schemas.business import BusinessOut

router = APIRouter()


@router.get("/businesses/{business_id}", response_model=BusinessOut)
async def get_business(business_id: uuid.UUID, db: DB) -> BusinessOut:
    result = await db.execute(select(Business).where(Business.id == business_id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return BusinessOut.model_validate(business)
