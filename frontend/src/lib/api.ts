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
  // Direct matches
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
  // Vancouver registry categories
  'food service': 'restaurant',
  'liquor': 'restaurant',
  'class 1': 'restaurant',
  'caterer': 'restaurant',
  'food processing': 'restaurant',
  'food cart': 'restaurant',
  'tea & coffee service': 'cafe',
  'juice bar': 'cafe',
  'food retail': 'grocery',
  'produce': 'grocery',
  'market': 'grocery',
  'supermarket': 'grocery',
  'hair': 'salon',
  'beauty': 'salon',
  'barber': 'salon',
  'spa': 'salon',
  'nail': 'salon',
  'esthetician': 'salon',
  'tattoo': 'art',
  'photographer': 'art',
  'music': 'art',
  'dance': 'art',
  'theatre': 'art',
  'florist': 'retail',
  'clothing': 'retail',
  'pet': 'retail',
  'book': 'retail',
  'gift': 'retail',
  'jewel': 'retail',
  'auto': 'repair',
  'mechanic': 'repair',
  'electronics': 'repair',
  'tailor': 'repair',
  'shoe repair': 'repair',
  'locksmith': 'repair',
  'bicycle': 'repair',
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
  const types = new Set(signals.map((s) => s.type.toLowerCase()));
  const hasStreetView = types.has('street_view');
  const hasSocial = types.has('social');
  if (hasStreetView && hasSocial) return 'both';
  if (hasStreetView) return 'street_view';
  if (hasSocial) return 'social_media';
  return 'street_view'; // registry-only defaults to street_view
}

// ── Convert backend result to frontend Business ─────────────────────────────

function buildDescription(item: { canonical_name: string; primary_category: string | null; secondary_tags: string[] | null; evidence_signals?: { type: string; features: Record<string, unknown> | null }[] }): string {
  // Try to extract trade_name from registry evidence for a friendlier description
  const registry = item.evidence_signals?.find((e) => e.type === 'city_registry' || e.type === 'CITY_REGISTRY');
  const tradeName = registry?.features?.trade_name as string | undefined;
  const bizType = registry?.features?.business_type as string | undefined;
  const subType = registry?.features?.business_subtype as string | undefined;
  const localArea = registry?.features?.local_area as string | undefined;

  const parts: string[] = [];
  if (tradeName && tradeName.toLowerCase() !== item.canonical_name.toLowerCase()) {
    parts.push(`Also known as ${tradeName}.`);
  }
  if (bizType) parts.push(bizType);
  if (subType && subType !== bizType) parts.push(`(${subType})`);
  if (localArea) parts.push(`in ${localArea}`);

  return parts.join(' ') || item.primary_category || 'Local business';
}

function bestName(item: { canonical_name: string; evidence_signals?: { type: string; features: Record<string, unknown> | null }[] }): string {
  const registry = item.evidence_signals?.find((e) => e.type === 'city_registry' || e.type === 'CITY_REGISTRY');
  const tradeName = registry?.features?.trade_name as string | undefined;
  // Prefer trade name over legal names like "(Danny Nikas)" or "1222773 BC LTD"
  if (tradeName && tradeName.trim()) return tradeName;
  // Clean up parenthesized legal names
  const name = item.canonical_name;
  if (name.startsWith('(') && name.endsWith(')')) return name.slice(1, -1);
  return name;
}

function toFrontendBusiness(item: BackendSearchResultItem): Business {
  return {
    id: item.business_id,
    name: bestName(item),
    category: mapCategory(item.primary_category),
    description: buildDescription(item),
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
  const detailWithSignals = { canonical_name: item.canonical_name, evidence_signals: item.evidence_sources };
  return {
    id: item.id,
    name: bestName(detailWithSignals),
    category: mapCategory(item.primary_category),
    description: buildDescription({ ...item, evidence_signals: item.evidence_sources }),
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
