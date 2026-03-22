from __future__ import annotations


CATEGORY_MAP: dict[str, list[str]] = {
    "restaurant": [
        "restaurant",
        "cafe",
        "coffee",
        "food",
        "pizza",
        "sushi",
        "thai",
        "diner",
        "bistro",
    ],
    "retail": ["shop", "store", "boutique", "clothing", "shoes", "gifts"],
    "grocery": ["grocery", "market", "supermarket", "fruit", "produce", "halal", "asian market"],
    "services": ["salon", "barbershop", "hair", "nails", "spa", "laundry", "dry cleaning"],
    "health": ["pharmacy", "clinic", "dental", "optician", "physiotherapy"],
    "auto": ["mechanic", "auto", "tires", "car wash"],
    "other": [],
}


def normalize_category(raw_category: str) -> str:
    candidate = (raw_category or "").strip().lower()
    if not candidate:
        return "other"
    for normalized, aliases in CATEGORY_MAP.items():
        if candidate == normalized:
            return normalized
        if any(alias in candidate for alias in aliases):
            return normalized
    return "other"


def score_confidence(
    vlm_confidence: float,
    ocr_text_quality: float,
    cross_reference_match: bool,
) -> float:
    vlm = max(0.0, min(1.0, vlm_confidence))
    ocr = max(0.0, min(1.0, ocr_text_quality))
    xref = 1.0 if cross_reference_match else 0.0
    score = (0.65 * vlm) + (0.20 * ocr) + (0.15 * xref)
    return round(max(0.0, min(1.0, score)), 3)
