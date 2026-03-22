import type { Business } from '../data/types';
import { mockBusinesses } from '../data/mockBusinesses';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export interface SearchResult {
  businesses: Business[];
  total: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface SearchParams {
  q?: string;
  category?: string;
  source?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sort_by?: string;
}

// ── Backend response types ──────────────────────────────────────────────────

interface BackendSearchResultItem {
  business_id: string;
  canonical_name: string;
  normalized_address: string | null;
  latitude: number;
  longitude: number;
  primary_category: string | null;
  secondary_tags: string[] | null;
  source_confidence_score: number;
  distance_m: number;
  similarity: number;
  hybrid_score: number;
  is_phantom: boolean;
  why: {
    matching_tags: string[];
    has_visual_evidence: boolean;
    has_social_signal: boolean;
    has_registry_record: boolean;
    is_listed_online: boolean;
    evidence_type_count: number;
  };
  evidence_signals: { type: string; raw_reference: string; features: Record<string, unknown> | null }[];
}

interface BackendSearchResponse {
  query_text: string;
  result_count: number;
  results: BackendSearchResultItem[];
}

interface BackendBusinessOut {
  id: string;
  canonical_name: string;
  normalized_address: string | null;
  latitude: number;
  longitude: number;
  primary_category: string | null;
  secondary_tags: string[] | null;
  source_confidence_score: number;
  evidence_summary: Record<string, unknown> | null;
  evidence_sources: { type: string; raw_reference: string; features: Record<string, unknown> | null }[];
}

// ── Map backend category to frontend category ───────────────────────────────

const CATEGORY_MAP: Record<string, Business['category']> = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  coffee: 'cafe',
  bakery: 'bakery',
  retail: 'retail',
  grocery: 'grocery',
  salon: 'salon',
  barbershop: 'salon',
  repair: 'repair',
  art: 'art',
  gallery: 'art',
  studio: 'art',
};

function mapCategory(cat: string | null): Business['category'] {
  if (!cat) return 'retail';
  const lower = cat.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 'retail';
}

// ── Map backend evidence types to frontend source ───────────────────────────

function mapSource(signals: { type: string }[]): Business['source'] {
  const types = new Set(signals.map((s) => s.type));
  const hasStreetView = types.has('STREET_VIEW');
  const hasSocial = types.has('SOCIAL');
  if (hasStreetView && hasSocial) return 'both';
  if (hasSocial) return 'social_media';
  return 'street_view';
}

// ── Convert backend result to frontend Business ─────────────────────────────

function toFrontendBusiness(item: BackendSearchResultItem): Business {
  return {
    id: item.business_id,
    name: item.canonical_name,
    category: mapCategory(item.primary_category),
    description: item.secondary_tags?.join(', ') || item.primary_category || '',
    address: item.normalized_address || '',
    lat: item.latitude,
    lng: item.longitude,
    confidence: item.source_confidence_score,
    source: mapSource(item.evidence_signals),
    onGoogle: !item.is_phantom,
    tags: item.secondary_tags || [],
    discoveredAt: new Date().toISOString(),
  };
}

function toFrontendBusinessFromDetail(item: BackendBusinessOut): Business {
  return {
    id: item.id,
    name: item.canonical_name,
    category: mapCategory(item.primary_category),
    description: item.secondary_tags?.join(', ') || item.primary_category || '',
    address: item.normalized_address || '',
    lat: item.latitude,
    lng: item.longitude,
    confidence: item.source_confidence_score,
    source: mapSource(item.evidence_sources),
    onGoogle: item.evidence_sources.some((e) => e.type === 'LOCAL_LISTING_API'),
    tags: item.secondary_tags || [],
    discoveredAt: new Date().toISOString(),
  };
}

// ── API functions ───────────────────────────────────────────────────────────

export async function searchBusinesses(params: SearchParams = {}): Promise<SearchResult> {
  try {
    const resp = await fetch(`${BASE}/api/v1/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_text: params.q || 'businesses',
        latitude: params.lat ?? 49.27,
        longitude: params.lng ?? -123.0724,
        radius_km: (params.radius ?? 5000) / 1000,
        limit: 50,
      }),
    });
    if (!resp.ok) throw new Error(`Search API error: ${resp.status}`);
    const data: BackendSearchResponse = await resp.json();
    const businesses = data.results.map(toFrontendBusiness);
    return { businesses, total: data.result_count };
  } catch {
    // Fallback to mock data when backend is unavailable
    return { businesses: mockBusinesses, total: mockBusinesses.length };
  }
}

export async function getBusiness(id: string): Promise<Business> {
  try {
    const resp = await fetch(`${BASE}/api/v1/businesses/${id}`);
    if (!resp.ok) throw new Error(`Business not found: ${resp.status}`);
    const data: BackendBusinessOut = await resp.json();
    return toFrontendBusinessFromDetail(data);
  } catch {
    // Fallback to mock data
    const biz = mockBusinesses.find((b) => b.id === id);
    if (!biz) throw new Error('Business not found');
    return biz;
  }
}

export async function getCategories(): Promise<CategoryCount[]> {
  try {
    // No dedicated categories endpoint in backend — derive from search
    const result = await searchBusinesses();
    const counts = new Map<string, number>();
    for (const b of result.businesses) {
      counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
    }
    return Array.from(counts, ([category, count]) => ({ category, count }));
  } catch {
    const counts = new Map<string, number>();
    for (const b of mockBusinesses) {
      counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
    }
    return Array.from(counts, ([category, count]) => ({ category, count }));
  }
}
