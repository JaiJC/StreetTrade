import type { Category } from '../data/types';
import { categories } from '../data/mockBusinesses';

export type SortOption = 'relevance' | 'confidence' | 'name';
export type SourceFilter = 'all' | 'street_view' | 'social_media' | 'both';
export type ConfidenceFilter = 'all' | '80' | '90';

type DistanceFilter = '500m' | '1km' | '2km' | '5km';

interface FilterBarProps {
  category: Category;
  onCategoryChange: (cat: Category) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  sourceFilter: SourceFilter;
  onSourceChange: (source: SourceFilter) => void;
  confidenceFilter: ConfidenceFilter;
  onConfidenceChange: (conf: ConfidenceFilter) => void;
  exclusiveOnly: boolean;
  onExclusiveToggle: () => void;
  resultCount: number;
  exclusiveCount: number;
  googleCount: number;
  query?: string;
}

const sourcePills: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'street_view', label: 'Street View Only' },
  { value: 'social_media', label: 'Registry Only' },
];

const distanceOptions: DistanceFilter[] = ['500m', '1km', '2km', '5km'];

export default function FilterBar({
  category,
  onCategoryChange,
  sortBy,
  onSortChange,
  sourceFilter,
  onSourceChange,
  resultCount,
  query,
}: FilterBarProps) {
  return (
    <div className="bg-[#0a0e17] border-b border-[#1e2a3a] py-3 px-4 space-y-3">
      {/* Row 1: Category + Distance Pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              category === cat.value
                ? 'bg-[#e88c0a] text-white'
                : 'bg-[#1a2332] text-gray-400 hover:text-gray-300'
            }`}
          >
            {cat.label}
          </button>
        ))}

        <div className="w-px h-5 bg-[#1e2a3a] mx-1 shrink-0" />

        {distanceOptions.map((dist) => (
          <button
            key={dist}
            className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap bg-[#1a2332] text-gray-400 hover:text-gray-300 transition-all"
          >
            {dist}
          </button>
        ))}

        <div className="w-px h-5 bg-[#1e2a3a] mx-1 shrink-0" />

        <button
          className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap bg-[#1a2332] text-gray-400 hover:text-gray-300 transition-all"
        >
          Business
        </button>
      </div>

      {/* Row 2: Source pills + sort text + result count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sourcePills.map((pill) => (
            <button
              key={pill.value}
              onClick={() => onSourceChange(pill.value)}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                sourceFilter === pill.value
                  ? 'bg-[#e88c0a] text-white'
                  : 'bg-[#1a2332] text-gray-400 hover:text-gray-300'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {query && (
            <span className="text-sm text-gray-400">
              <span className="text-white font-medium">{resultCount}</span>
              {' results for '}
              <span className="text-[#e88c0a]">'{query}'</span>
            </span>
          )}
          <button
            onClick={() => onSortChange(sortBy === 'confidence' ? 'relevance' : 'confidence')}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sorted by {sortBy}
          </button>
        </div>
      </div>
    </div>
  );
}
