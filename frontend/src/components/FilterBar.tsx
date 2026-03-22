import type { Category } from '../data/types';
import { categories } from '../data/mockBusinesses';

export type SortOption = 'relevance' | 'confidence' | 'name';
export type SourceFilter = 'all' | 'street_view' | 'social_media' | 'both';
export type ConfidenceFilter = 'all' | '80' | '90';

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
}

const sourcePills: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'street_view', label: 'Street View' },
  { value: 'social_media', label: 'Social' },
  { value: 'both', label: 'Both' },
];

const confidencePills: { value: ConfidenceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '80', label: '80%+' },
  { value: '90', label: '90%+' },
];

export default function FilterBar({
  category,
  onCategoryChange,
  sortBy,
  onSortChange,
  sourceFilter,
  onSourceChange,
  confidenceFilter,
  onConfidenceChange,
  exclusiveOnly,
  onExclusiveToggle,
  resultCount,
  exclusiveCount,
  googleCount,
}: FilterBarProps) {
  return (
    <div className="bg-surface border-b border-surface-lighter space-y-3 py-3">
      {/* Row 1: Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none px-1">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              category === cat.value
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-surface-light text-gray-400 border border-surface-lighter hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-base leading-none">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Row 2: Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        {/* Sort Dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-surface-light border border-surface-lighter rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-primary appearance-none cursor-pointer pr-6"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 6px center',
            }}
          >
            <option value="relevance">Relevance</option>
            <option value="confidence">Confidence</option>
            <option value="name">Name</option>
          </select>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-surface-lighter" />

        {/* Source Pills */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Source:</span>
          {sourcePills.map((pill) => (
            <button
              key={pill.value}
              onClick={() => onSourceChange(pill.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                sourceFilter === pill.value
                  ? 'border border-primary text-primary bg-primary/5'
                  : 'bg-surface-light border border-surface-lighter text-gray-400 hover:text-gray-300 hover:border-gray-500'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-surface-lighter" />

        {/* Confidence Pills */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Confidence:</span>
          {confidencePills.map((pill) => (
            <button
              key={pill.value}
              onClick={() => onConfidenceChange(pill.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                confidenceFilter === pill.value
                  ? 'border border-primary text-primary bg-primary/5'
                  : 'bg-surface-light border border-surface-lighter text-gray-400 hover:text-gray-300 hover:border-gray-500'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-surface-lighter" />

        {/* Exclusive Toggle */}
        <button
          onClick={onExclusiveToggle}
          className="flex items-center gap-2 group"
          role="switch"
          aria-checked={exclusiveOnly}
        >
          <div
            className={`relative w-8 h-[18px] rounded-full transition-colors ${
              exclusiveOnly ? 'bg-primary' : 'bg-surface-lighter'
            }`}
          >
            <div
              className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
                exclusiveOnly ? 'translate-x-[16px]' : 'translate-x-[2px]'
              }`}
            />
          </div>
          <span
            className={`text-xs font-medium transition-colors ${
              exclusiveOnly
                ? 'text-primary'
                : 'text-gray-400 group-hover:text-gray-300'
            }`}
          >
            StreetTrade Only
          </span>
        </button>
      </div>

      {/* Row 3: Results Summary */}
      <div className="px-1 flex items-center gap-1.5 text-xs text-gray-500">
        <span>
          Showing <span className="text-gray-300 font-medium">{resultCount}</span>{' '}
          businesses
        </span>
        <span>&middot;</span>
        <span>
          <span className="text-primary font-medium">{exclusiveCount}</span> exclusive
          to StreetTrade
        </span>
        <span>&middot;</span>
        <span>
          Google shows <span className="text-gray-300 font-medium">{googleCount}</span>
        </span>
      </div>
    </div>
  );
}
