"""CLIP-based embedding service.

Uses openai/clip-vit-base-patch32 for both text and image embeddings
in a shared 512-dimensional vector space. Runs entirely locally on CPU.
"""

from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Protocol

import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor, CLIPTokenizerFast

from app.config import settings

CATEGORY_LABELS = [
    "cafe", "coffee shop", "restaurant", "bar", "pub", "bakery",
    "clothing store", "vintage clothing store", "thrift shop",
    "bookstore", "record store", "gift shop", "florist",
    "hair salon", "barbershop", "nail salon", "tattoo parlour",
    "grocery store", "convenience store", "pharmacy",
    "gym", "yoga studio", "laundromat",
    "art gallery", "antique shop", "jewelry store",
]

VIBE_LABELS = [
    "cozy", "minimalist", "vintage", "industrial", "colorful",
    "rustic", "modern", "bohemian", "dark academia", "plant-filled",
    "family-friendly", "hipster", "upscale", "casual", "quirky",
    "artsy", "retro", "eco-friendly", "hidden gem", "hole-in-the-wall",
]


class EmbeddingService(Protocol):
    async def embed_text(self, text: str) -> list[float]: ...
    async def embed_image(self, image: Image.Image) -> list[float]: ...


class CLIPEmbeddingService:
    """Singleton CLIP model wrapper. Thread-safe for async use."""

    def __init__(self) -> None:
        self._model = CLIPModel.from_pretrained(settings.clip_model_name)
        self._processor = CLIPProcessor.from_pretrained(settings.clip_model_name)
        self._tokenizer = CLIPTokenizerFast.from_pretrained(settings.clip_model_name)
        self._model.eval()

    # --- sync internals (run in thread pool) ---

    @staticmethod
    def _to_tensor(output: object) -> torch.Tensor:
        """Extract tensor from model output (handles both old and new transformers)."""
        if isinstance(output, torch.Tensor):
            return output
        # transformers >= 5.x returns BaseModelOutputWithPooling
        if hasattr(output, 'text_embeds'):
            return output.text_embeds
        if hasattr(output, 'image_embeds'):
            return output.image_embeds
        # Generic fallback
        if hasattr(output, 'pooler_output'):
            return output.pooler_output
        if hasattr(output, 'last_hidden_state'):
            return output.last_hidden_state[:, 0]
        raise TypeError(f"Unexpected model output type: {type(output)}")

    def _embed_text_sync(self, text: str) -> list[float]:
        inputs = self._tokenizer(
            [text], return_tensors="pt", padding=True, truncation=True, max_length=77
        )
        with torch.no_grad():
            raw = self._model.get_text_features(**inputs)
        features = self._to_tensor(raw)
        features = features / features.norm(dim=-1, keepdim=True)
        return features[0].tolist()

    def _embed_texts_sync(self, texts: list[str]) -> list[list[float]]:
        inputs = self._tokenizer(
            texts, return_tensors="pt", padding=True, truncation=True, max_length=77
        )
        with torch.no_grad():
            raw = self._model.get_text_features(**inputs)
        features = self._to_tensor(raw)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.tolist()

    def _embed_image_sync(self, image: Image.Image) -> list[float]:
        inputs = self._processor(images=[image], return_tensors="pt")
        with torch.no_grad():
            raw = self._model.get_image_features(**inputs)
        features = self._to_tensor(raw)
        features = features / features.norm(dim=-1, keepdim=True)
        return features[0].tolist()

    def _embed_images_sync(self, images: list[Image.Image]) -> list[list[float]]:
        inputs = self._processor(images=images, return_tensors="pt")
        with torch.no_grad():
            raw = self._model.get_image_features(**inputs)
        features = self._to_tensor(raw)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.tolist()

    def _classify_image_sync(
        self, image: Image.Image, candidate_labels: list[str]
    ) -> list[tuple[str, float]]:
        prompts = [f"a photo of a {label}" for label in candidate_labels]
        text_inputs = self._tokenizer(
            prompts, return_tensors="pt", padding=True, truncation=True, max_length=77
        )
        image_inputs = self._processor(images=[image], return_tensors="pt")
        with torch.no_grad():
            text_features = self._to_tensor(self._model.get_text_features(**text_inputs))
            image_features = self._to_tensor(self._model.get_image_features(**image_inputs))
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        similarity = (image_features @ text_features.T).softmax(dim=-1)
        scores = similarity[0].tolist()
        return sorted(zip(candidate_labels, scores), key=lambda x: -x[1])

    def _tag_image_vibes_sync(
        self, image: Image.Image, threshold: float = 0.08
    ) -> list[tuple[str, float]]:
        ranked = self._classify_image_sync(image, VIBE_LABELS)
        return [(label, score) for label, score in ranked if score >= threshold]

    # --- async public API ---

    async def embed_text(self, text: str) -> list[float]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._embed_text_sync, text)

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._embed_texts_sync, texts)

    async def embed_image(self, image: Image.Image) -> list[float]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._embed_image_sync, image)

    async def embed_images(self, images: list[Image.Image]) -> list[list[float]]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._embed_images_sync, images)

    async def classify_image(
        self, image: Image.Image, candidate_labels: list[str] | None = None
    ) -> list[tuple[str, float]]:
        labels = candidate_labels or CATEGORY_LABELS
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, self._classify_image_sync, image, labels
        )

    async def tag_image_vibes(
        self, image: Image.Image, threshold: float = 0.08
    ) -> list[tuple[str, float]]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, self._tag_image_vibes_sync, image, threshold
        )


@lru_cache(maxsize=1)
def get_embedding_service() -> CLIPEmbeddingService:
    return CLIPEmbeddingService()
