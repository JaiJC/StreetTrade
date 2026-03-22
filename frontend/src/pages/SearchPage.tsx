import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import type { SortOption, SourceFilter, ConfidenceFilter } from '../components/FilterBar';
import BusinessCard from '../components/BusinessCard';
import MapView from '../components/MapView';
import { mockBusinesses } from '../data/mockBusinesses';
import type { Category } from '../data/types';

const VANCOUVER_CENTER: [number, number] = [49.27, -123.0724];

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [sortBy, setSortBy] = useState<SortOption>('confidence');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');
  const [exclusiveOnly, setExclusiveOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [mapCenter, setMapCenter] = useState<[number, number]>(VANCOUVER_CENTER);
  const listRef = useRef<HTMLDivElement>(null);

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

      if (confidenceFilter === '80' && biz.confidence < 0.8) return false;
      if (confidenceFilter === '90' && biz.confidence < 0.9) return false;

      if (exclusiveOnly && biz.onGoogle) return false;

      return true;
    });

    if (sortBy === 'confidence') {
      results = [...results].sort((a, b) => b.confidence - a.confidence);
    } else if (sortBy === 'name') {
      results = [...results].sort((a, b) => a.name.localeCompare(b.name));
    }

    return results;
  }, [query, category, sortBy, sourceFilter, confidenceFilter, exclusiveOnly]);

  const googleCount = filtered.filter((b) => b.onGoogle).length;
  const exclusiveCount = filtered.filter((b) => !b.onGoogle).length;
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
        <SearchBar onSearch={handleSearch} onSelectBusiness={handleSelectBusiness} />
      </header>

      {/* Filter bar */}
      <FilterBar
        category={category}
        onCategoryChange={setCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sourceFilter={sourceFilter}
        onSourceChange={setSourceFilter}
        confidenceFilter={confidenceFilter}
        onConfidenceChange={setConfidenceFilter}
        exclusiveOnly={exclusiveOnly}
        onExclusiveToggle={() => setExclusiveOnly((v) => !v)}
        resultCount={totalCount}
        exclusiveCount={exclusiveCount}
        googleCount={googleCount}
        query={query || undefined}
      />

      {/* Main content: list + map */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Business list - 60% */}
        <div
          ref={listRef}
          className="w-full md:w-[60%] shrink-0 overflow-y-auto border-r border-[#1e2a3a] p-4 space-y-3 max-h-[50vh] md:max-h-full"
        >
          {/* Results header */}
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

        {/* Map - 40% */}
        <div className="flex-1 min-h-[300px]">
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
