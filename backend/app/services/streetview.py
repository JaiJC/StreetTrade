"""Street-level imagery analysis pipeline.

Takes raw image tiles and for each detected storefront produces:
  - coarse business category (zero-shot CLIP classification)
  - vibe/aesthetic tags (zero-shot CLIP)
  - visual embedding vector (CLIP image encoder, 512d)
  - name hints from signage (easyocr)

Storefront detection is simplified for hackathon: we process each full
tile as a single storefront candidate. The interface is designed so a
real object-detection step (YOLOv8 / Grounding DINO) can be inserted
later without changing downstream consumers.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field

import numpy as np
from PIL import Image

from app.services.embedding import CLIPEmbeddingService

log = logging.getLogger(__name__)


def _load_ocr_reader():
    """Lazy-load easyocr to avoid import cost when not needed."""
    try:
        import easyocr
        return easyocr.Reader(["en"], gpu=False, verbose=False)
    except ImportError:
        log.warning("easyocr not installed — OCR disabled. pip install easyocr")
        return None


_ocr_reader = None


def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        _ocr_reader = _load_ocr_reader()
    return _ocr_reader


def _run_ocr(image: Image.Image) -> list[str]:
    """Extract text from an image using easyocr. Returns list of
    detected text strings, filtered to likely business name fragments."""
    reader = _get_ocr_reader()
    if reader is None:
        return []

    img_array = np.array(image)
    results = reader.readtext(img_array, detail=1)

    name_hints: list[str] = []
    for bbox, text, confidence in results:
        text = text.strip()
        if confidence < 0.3 or len(text) < 2:
            continue
        # Filter out very short or purely numeric strings
        if text.isdigit() or len(text) <= 1:
            continue
        name_hints.append(text)

    return name_hints


@dataclass
class StorefrontCandidate:
    category: str
    category_confidence: float
    vibe_tags: list[str]
    vibe_scores: dict[str, float]
    name_hints: list[str]
    visual_embedding: list[float]
    latitude: float
    longitude: float
    tile_index: int
    heading: float | None = None


async def analyze_tile(
    image: Image.Image,
    latitude: float,
    longitude: float,
    tile_index: int,
    heading: float | None,
    embedder: CLIPEmbeddingService,
    category_threshold: float = 0.15,
    run_ocr: bool = True,
) -> StorefrontCandidate | None:
    """Analyze a single street-view tile.

    Returns None if no storefront-like content is detected above threshold.
    Runs CLIP classification + vibe tagging + embedding, and optionally OCR.
    """
    classifications = await embedder.classify_image(image)
    top_category, top_score = classifications[0]

    if top_score < category_threshold:
        return None

    vibes = await embedder.tag_image_vibes(image)
    visual_embedding = await embedder.embed_image(image)

    name_hints: list[str] = []
    if run_ocr:
        loop = asyncio.get_running_loop()
        name_hints = await loop.run_in_executor(None, _run_ocr, image)

    return StorefrontCandidate(
        category=top_category,
        category_confidence=top_score,
        vibe_tags=[v[0] for v in vibes],
        vibe_scores={v[0]: round(v[1], 4) for v in vibes},
        name_hints=name_hints,
        visual_embedding=visual_embedding,
        latitude=latitude,
        longitude=longitude,
        tile_index=tile_index,
        heading=heading,
    )


async def analyze_location_tiles(
    tiles: list[Image.Image],
    latitude: float,
    longitude: float,
    headings: list[float] | None = None,
    embedder: CLIPEmbeddingService | None = None,
    run_ocr: bool = True,
) -> list[StorefrontCandidate]:
    """Analyze all tiles for a single location. Returns candidates for
    tiles that look like they contain a storefront."""

    if embedder is None:
        from app.services.embedding import get_embedding_service
        embedder = get_embedding_service()

    _headings = headings or [i * (360.0 / len(tiles)) for i in range(len(tiles))]

    candidates: list[StorefrontCandidate] = []
    for i, tile in enumerate(tiles):
        result = await analyze_tile(
            image=tile,
            latitude=latitude,
            longitude=longitude,
            tile_index=i,
            heading=_headings[i] if i < len(_headings) else None,
            embedder=embedder,
            run_ocr=run_ocr,
        )
        if result is not None:
            candidates.append(result)

    return candidates
