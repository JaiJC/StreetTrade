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
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');
  const [exclusiveOnly, setExclusiveOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [mapCenter, setMapCenter] = useState<[number, number]>(VANCOUVER_CENTER);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and sort businesses
  const filtered = useMemo(() => {
    let results = mockBusinesses.filter((biz) => {
      // Category filter
      if (category !== 'all' && biz.category !== category) return false;

      // Text search
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesQuery =
          biz.name.toLowerCase().includes(q) ||
          biz.tags.some((t) => t.toLowerCase().includes(q)) ||
          biz.description.toLowerCase().includes(q) ||
          biz.category.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Source filter
      if (sourceFilter !== 'all' && biz.source !== sourceFilter) return false;

      // Confidence filter
      if (confidenceFilter === '80' && biz.confidence < 0.8) return false;
      if (confidenceFilter === '90' && biz.confidence < 0.9) return false;

      // Exclusive only
      if (exclusiveOnly && biz.onGoogle) return false;

      return true;
    });

    // Sort
    if (sortBy === 'confidence') {
      results = [...results].sort((a, b) => b.confidence - a.confidence);
    } else if (sortBy === 'name') {
      results = [...results].sort((a, b) => a.name.localeCompare(b.name));
    }

    return results;
  }, [query, category, sortBy, sourceFilter, confidenceFilter, exclusiveOnly]);

  // Stats
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

  // Scroll selected card into view
  useEffect(() => {
    if (selectedId && listRef.current) {
      const card = listRef.current.querySelector(`[data-biz-id="${selectedId}"]`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  return (
    <div className="min-h-screen bg-surface text-white flex flex-col">
      {/* Search bar */}
      <header className="border-b border-surface-lighter px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <SearchBar onSearch={handleSearch} onSelectBusiness={handleSelectBusiness} />
        </div>
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
      />

      {/* Main content: list + map */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
        {/* Business list */}
        <div
          ref={listRef}
          className="md:w-[420px] lg:w-[480px] xl:w-[520px] shrink-0 overflow-y-auto border-r border-surface-lighter p-4 space-y-3 max-h-[50vh] md:max-h-full"
        >
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

        {/* Map */}
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
