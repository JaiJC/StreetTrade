import json
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import Boolean, Column, Float, String, Text

from database import Base


# ─── SQLAlchemy Model ─────────────────────────────────────────────────────────

class BusinessModel(Base):
    __tablename__ = "businesses"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, default="")
    address = Column(String, default="")
    lat = Column(Float, default=0.0)
    lng = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    source = Column(String, default="street_view")
    on_google = Column(Boolean, default=False)
    image_url = Column(String, nullable=True)
    tags = Column(Text, default="[]")  # JSON string
    discovered_at = Column(String, default="")


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class BusinessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    category: str
    description: str
    address: str
    lat: float
    lng: float
    confidence: float
    source: str
    on_google: bool = Field(alias="onGoogle", serialization_alias="onGoogle")
    image_url: Optional[str] = Field(None, alias="imageUrl", serialization_alias="imageUrl")
    tags: list[str]
    discovered_at: str = Field(alias="discoveredAt", serialization_alias="discoveredAt")

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v


class BusinessListResponse(BaseModel):
    businesses: list[BusinessOut]
    total: int


class CategoryCount(BaseModel):
    category: str
    count: int
