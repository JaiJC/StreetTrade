from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.services.embedding import CLIPEmbeddingService, get_embedding_service

DB = Annotated[AsyncSession, Depends(get_db)]
Embedder = Annotated[CLIPEmbeddingService, Depends(get_embedding_service)]
