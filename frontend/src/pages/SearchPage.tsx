import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import type { SortOption, SourceFilter, DistanceFilter } from '../components/FilterBar';
import BusinessCard from '../components/BusinessCard';
import MapView from '../components/MapView';
import { mockBusinesses } from '../data/mockBusinesses';
import type { Category } from '../data/types';

const VANCOUVER_CENTER: [number, number] = [49.27, -123.0724];

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<SortOption>('confidence');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [distance, setDistance] = useState<DistanceFilter>('5km');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [mapCenter, setMapCenter] = useState<[number, number]>(VANCOUVER_CENTER);
  const listRef = useRef<HTMLDivElement>(null);

  // Convert distance filter string to km number
  const distanceKm = useMemo(() => {
    const map: Record<DistanceFilter, number> = { '500m': 0.5, '1km': 1, '2km': 2, '5km': 5 };
    return map[distance];
  }, [distance]);

  // Rough distance calc (good enough for city-scale filtering)
  const getDistanceKm = useCallback((lat: number, lng: number) => {
    const dLat = (lat - VANCOUVER_CENTER[0]) * 111;
    const dLng = (lng - VANCOUVER_CENTER[1]) * 111 * Math.cos(VANCOUVER_CENTER[0] * Math.PI / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  }, []);

  // Filter and sort businesses
  const filtered = useMemo(() => {
    let results = mockBusinesses.filter((biz) => {
      if (category !== 'all' && biz.category !== category) return false;

      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesQuery =
          biz.name.toLowerCase().includes(q) ||
          biz.tags.some((t) => t.toLowerCase().includes(q)) ||
          biz.description.toLowerCase().includes(q) ||
          biz.category.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      if (sourceFilter !== 'all' && biz.source !== sourceFilter) return false;

      if (getDistanceKm(biz.lat, biz.lng) > distanceKm) return false;

      return true;
    });

    if (sortBy === 'confidence') {
      results = [...results].sort((a, b) => b.confidence - a.confidence);
    } else if (sortBy === 'name') {
      results = [...results].sort((a, b) => a.name.localeCompare(b.name));
    }

    return results;
  }, [query, category, sortBy, sourceFilter, distanceKm, getDistanceKm]);

  const totalCount = filtered.length;

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const handleSelectBusiness = useCallback(
    (id: string) => {
      navigate(`/business/${id}`);
    },
    [navigate],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const biz = mockBusinesses.find((b) => b.id === id);
    if (biz) {
      setMapCenter([biz.lat, biz.lng]);
    }
  }, []);

  useEffect(() => {
    if (selectedId && listRef.current) {
      const card = listRef.current.querySelector(`[data-biz-id="${selectedId}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white flex flex-col">
      {/* Search bar */}
      <header className="bg-[#0a0e17] border-b border-[#1e2a3a] px-4 py-4">
        <SearchBar onSearch={handleSearch} onSelectBusiness={handleSelectBusiness} initialQuery={initialQuery} />
      </header>

      {/* Filter bar */}
      <FilterBar
        category={category}
        onCategoryChange={setCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        distance={distance}
        onDistanceChange={setDistance}
        resultCount={totalCount}
        query={query || undefined}
      />

      {/* Main content: list + map — desktop only layout */}
      <div className="flex-1 flex flex-row overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Business list — 45% */}
        <div
          ref={listRef}
          className="w-[45%] shrink-0 overflow-y-auto border-r border-[#1e2a3a] p-4 space-y-3"
        >
          {query && (
            <div className="pb-2">
              <h2 className="text-sm text-gray-400">
                <span className="text-white font-semibold">{totalCount} results</span>
                {' for '}
                <span className="text-[#e88c0a] font-medium">'{query}'</span>
              </h2>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No businesses found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            filtered.map((biz) => (
              <div key={biz.id} data-biz-id={biz.id}>
                <BusinessCard
                  business={biz}
                  isSelected={selectedId === biz.id}
                  onClick={() => handleSelect(biz.id)}
                />
              </div>
            ))
          )}
        </div>

        {/* Map — 55% */}
        <div className="flex-1">
          <MapView
            businesses={filtered}
            selectedId={selectedId}
            onSelect={handleSelect}
            center={mapCenter}
          />
        </div>
      </div>
    </div>
  );
}
