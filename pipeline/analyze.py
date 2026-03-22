from __future__ import annotations

import base64
import json
import os
import re
from typing import Any, TypedDict

import requests


class StorefrontAnalysis(TypedDict):
    is_storefront: bool
    business_name: str | None
    category: str | None
    confidence: float
    raw_ocr_text: str


PROMPT = (
    "Is this image a storefront? If yes, what type of business is it? "
    "Extract the business name if visible. "
    "Answer in JSON: {is_storefront: bool, business_name: string|null, "
    "category: string|null, confidence: float}"
)


def _extract_json_blob(text: str) -> dict[str, Any] | None:
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _ocr_with_google_vision(image_url: str, api_key: str) -> str:
    endpoint = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
    payload = {
        "requests": [
            {
                "image": {"source": {"imageUri": image_url}},
                "features": [{"type": "TEXT_DETECTION"}],
            }
        ]
    }
    response = requests.post(endpoint, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()
    annotations = data.get("responses", [{}])[0].get("textAnnotations", [])
    if not annotations:
        return ""
    return annotations[0].get("description", "").strip()


def _ocr_with_google_vision_content(image_bytes: bytes, api_key: str) -> str:
    endpoint = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
    payload = {
        "requests": [
            {
                "image": {"content": base64.b64encode(image_bytes).decode("utf-8")},
                "features": [{"type": "TEXT_DETECTION"}],
            }
        ]
    }
    response = requests.post(endpoint, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()
    annotations = data.get("responses", [{}])[0].get("textAnnotations", [])
    if not annotations:
        return ""
    return annotations[0].get("description", "").strip()


def _classify_with_moondream(image_url: str, ocr_text: str, hf_api_token: str) -> dict[str, Any]:
    endpoint = "https://api-inference.huggingface.co/models/vikhyatk/moondream2"
    headers = {"Authorization": f"Bearer {hf_api_token}"}
    response = requests.post(
        endpoint,
        headers=headers,
        json={
            "inputs": {
                "image": image_url,
                "prompt": f"{PROMPT}\nOCR text: {ocr_text}",
            },
            "options": {"wait_for_model": True},
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()

    if isinstance(payload, dict) and "generated_text" in payload:
        parsed = _extract_json_blob(str(payload["generated_text"]))
        if parsed:
            return parsed

    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                if "generated_text" in item:
                    parsed = _extract_json_blob(str(item["generated_text"]))
                    if parsed:
                        return parsed
                parsed = _extract_json_blob(json.dumps(item))
                if parsed:
                    return parsed

    return {}


def _rules_based_classifier(ocr_text: str, image_url: str) -> dict[str, Any]:
    source_text = f"{ocr_text} {image_url}".lower()

    keywords = [
        ("restaurant", ["restaurant", "grill", "bbq", "sushi", "cafe", "pizza"]),
        ("grocery", ["market", "grocery", "produce", "foods", "halal"]),
        ("services", ["barber", "salon", "laundry", "cleaners", "spa"]),
        ("auto", ["auto", "repair", "tires", "mechanic", "garage"]),
        ("retail", ["boutique", "shop", "store", "clothing"]),
    ]
    category = "other"
    for candidate, words in keywords:
        if any(word in source_text for word in words):
            category = candidate
            break

    uppercase_words = re.findall(r"\b[A-Z][A-Za-z0-9&'-]{2,}\b", ocr_text)
    business_name = " ".join(uppercase_words[:4]) if uppercase_words else None
    is_storefront = bool(category != "other" or ocr_text.strip())
    confidence = 0.78 if category != "other" else 0.62

    return {
        "is_storefront": is_storefront,
        "business_name": business_name,
        "category": category,
        "confidence": confidence,
    }


def analyze_storefront(image_url: str) -> StorefrontAnalysis:
    raw_ocr_text = ""
    vision_key = os.getenv("GOOGLE_VISION_API_KEY")
    if vision_key:
        try:
            raw_ocr_text = _ocr_with_google_vision(image_url=image_url, api_key=vision_key)
        except Exception:  # noqa: BLE001
            raw_ocr_text = ""

    hf_token = os.getenv("HF_API_TOKEN")
    output: dict[str, Any] = {}
    if hf_token:
        try:
            output = _classify_with_moondream(image_url=image_url, ocr_text=raw_ocr_text, hf_api_token=hf_token)
        except Exception:  # noqa: BLE001
            output = {}

    if not output:
        output = _rules_based_classifier(ocr_text=raw_ocr_text, image_url=image_url)

    return {
        "is_storefront": bool(output.get("is_storefront", False)),
        "business_name": output.get("business_name"),
        "category": output.get("category"),
        "confidence": max(0.0, min(1.0, float(output.get("confidence", 0.6)))),
        "raw_ocr_text": raw_ocr_text,
    }


def analyze_uploaded_storefront(image_bytes: bytes, filename: str = "uploaded image") -> StorefrontAnalysis:
    raw_ocr_text = ""
    vision_key = os.getenv("GOOGLE_VISION_API_KEY")
    if vision_key and image_bytes:
        try:
            raw_ocr_text = _ocr_with_google_vision_content(image_bytes=image_bytes, api_key=vision_key)
        except Exception:  # noqa: BLE001
            raw_ocr_text = ""

    output = _rules_based_classifier(ocr_text=raw_ocr_text, image_url=filename)
    return {
        "is_storefront": bool(output.get("is_storefront", False)),
        "business_name": output.get("business_name"),
        "category": output.get("category"),
        "confidence": max(0.0, min(1.0, float(output.get("confidence", 0.6)))),
        "raw_ocr_text": raw_ocr_text,
    }
