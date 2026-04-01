# HiddenCity

**Discover what Google doesn't show you.**

StreetTrade is an AI-powered local business discovery engine that finds real-world businesses invisible to traditional online search — using street view imagery, social media, and vision language models.

## The Problem

Consumers default to Google when searching for local businesses. But **56% of local businesses haven't claimed their Google Business listing**, and **30% of Canadian micro-businesses** (0–4 employees) don't even have a website ([CFIB](https://www.cfib.ca)). These businesses physically exist but are **digitally invisible**.

The result:

- **Consumers** think search results = all options. In reality, over half of local businesses are excluded.
- **Businesses** without online presence lose foot traffic → close down → community diversity shrinks.
- **Existing solutions** (Google My Business, Yelp, website builders) all require the business owner to take action — but micro-businesses lack the time, money, or know-how.

## Our Solution

We flip the model: instead of waiting for businesses to register themselves, we **proactively discover** them.

```
Google Street View / Mapillary imagery
              │
              ▼
   Vision Language Model (VLM)
   Analyze storefronts: signage, displays,
   awnings, window content
              │
              ▼
   Business Classification & Cataloging
   Name extraction, category inference,
   confidence scoring
              │
              ▼
   Cross-reference with Social Media
   Instagram geotags, Facebook pages,
   local directories
              │
              ▼
   Consumer Search Interface
   "Find [product] within [radius]"
   → Returns ALL nearby options,
     not just the ones on Google
```

### Key Insight

> Local commerce shouldn't be gatekept by SEO. We give consumers complete local options while giving businesses discoverability without requiring them to do anything.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│         React SPA — Search + Map + Results       │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│                  BACKEND API                     │
│            FastAPI / Express                     │
│   • Search endpoint                             │
│   • Radius-based geospatial query               │
│   • Business matching & ranking                 │
└──────┬────────────────────────┬─────────────────┘
       │                        │
       ▼                        ▼
┌──────────────┐   ┌──────────────────────────────┐
│   Database   │   │     AI Discovery Pipeline     │
│  (PostGIS /  │   │                               │
│   SQLite)    │   │  1. Fetch street view tiles   │
│              │   │  2. VLM storefront analysis   │
│  • name      │   │  3. Text extraction (OCR)     │
│  • category  │   │  4. Category classification   │
│  • location  │   │  5. Social media enrichment   │
│  • source    │   │  6. Confidence scoring        │
│  • confidence│   │                               │
└──────────────┘   └──────────────────────────────┘
```

## Tech Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Frontend | React + Tailwind | Search UI, map, results |
| Map | Leaflet / Google Maps API | Display businesses + radius |
| Backend | FastAPI (Python) | API, geospatial queries |
| Database | SQLite + GeoJSON (MVP) | Store discovered businesses |
| AI / VLM | Claude Vision / GPT-4o | Storefront image analysis |
| Street View | Google Street View Static API | Source imagery |
| Social | Instagram Basic Display API | Cross-reference businesses |

## Project Structure

```
StreetTrade/
├── frontend/              # React app
│   ├── src/
│   │   ├── components/    # Search, Map, ResultCard, DetectionDemo
│   │   ├── pages/         # SearchPage, ResultsPage, HowItWorks
│   │   └── data/          # Mock data for demo
│   └── package.json
│
├── backend/               # API server
│   ├── api/
│   │   ├── routes/        # /search, /businesses, /discover
│   │   └── services/      # VLM pipeline, geocoding, social lookup
│   ├── models/            # Business schema
│   └── requirements.txt
│
├── pipeline/              # AI discovery pipeline
│   ├── streetview.py      # Fetch street view images by coordinates
│   ├── analyze.py         # VLM storefront analysis
│   ├── classify.py        # Category mapping & confidence scoring
│   └── enrich.py          # Social media cross-referencing
│
├── data/
│   └── mock_businesses.json
│
├── docs/
│   ├── pitch.md           # Problem statement & pitch narrative
│   └── demo-script.md     # Hackathon demo walkthrough
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Google Street View API key (optional for MVP — mock data available)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload
```

### Demo Mode

For hackathon presentation, the app runs with mock data simulating Vancouver storefronts. No API keys required.

```bash
cd frontend
npm run dev
# Opens at localhost:5173 with pre-populated Vancouver business data
```

## Team

| Name | Role | GitHub |
|------|------|--------|
| Jai  | —    | [@JaiJC](https://github.com/JaiJC) |

## Roadmap

- [x] Problem validation & pitch narrative
- [x] Concept demo (mock data, React prototype)
- [ ] Google Street View API integration
- [ ] VLM pipeline (storefront → business classification)
- [ ] Instagram / social media cross-referencing
- [ ] Geospatial search backend (PostGIS)
- [ ] Real Vancouver neighborhood pilot (Commercial Drive, E Hastings)
- [ ] Business owner claim & verification flow

## Why "StreetTrade"?

**Street** — we discover businesses from the street level, where they actually exist.
**Trade** — local commerce, the exchange that keeps communities alive.

---

*Built for the 56% of businesses Google can't find.*
