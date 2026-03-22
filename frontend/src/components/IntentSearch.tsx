import { useState } from 'react';
import { Search, Sparkles, MapPin, Clock } from 'lucide-react';

const SUGGESTIONS = [
  { area: 'Harajuku area', detail: '12 vintage shops nearby' },
  { area: 'Shimokitazawa', detail: '8 thrift stores found' },
];

const RECENT_SEARCHES = [
  'best ramen near Shibuya',
  'plant-based café with wifi',
  'handmade pottery shops',
];

export default function IntentSearch() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const showDropdown = isFocused || query.length > 0;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Intent Search</h2>
        <span className="text-xs font-semibold text-primary border border-primary rounded-full px-3 py-1">
          AI Powered
        </span>
      </div>

      {/* Search wrapper */}
      <div className="relative">
        {/* Search input */}
        <div
          className={`flex items-center gap-3 rounded-xl border bg-surface-light px-4 py-3 transition-all duration-300 ${
            isFocused
              ? 'border-primary shadow-[0_0_16px_rgba(232,140,10,0.25)]'
              : 'border-surface-border hover:border-surface-border/80'
          }`}
        >
          <Search className="w-5 h-5 text-primary shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="cozy study café with plants and sockets"
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>

        {/* Dropdown panel */}
        {showDropdown && (
          <div className="absolute z-50 left-0 right-0 mt-2 rounded-xl border border-surface-border bg-surface-light shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Intent Interpretation */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Intent Interpretation
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Looking for:{' '}
                <span className="text-primary font-medium">vintage clothing</span> |
                Style: <span className="text-primary font-medium">dark academia</span> |
                Distance: <span className="text-primary font-medium">2km</span>
              </p>
            </div>

            <div className="border-t border-surface-border" />

            {/* Quick Suggestions */}
            <div className="px-4 pt-3 pb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Quick Suggestions
              </span>
              <div className="mt-2 space-y-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.area}
                    className="flex items-center gap-3 w-full rounded-lg bg-surface-lighter px-3 py-2.5 text-left transition-colors hover:bg-surface-border/50"
                  >
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-white">{s.area}</span>
                      <span className="text-xs text-gray-500 ml-2">— {s.detail}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-surface-border" />

            {/* Recent Searches */}
            <div className="px-4 pt-3 pb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Recent Searches
              </span>
              <div className="mt-2 space-y-1">
                {RECENT_SEARCHES.map((text) => (
                  <button
                    key={text}
                    className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-400 transition-colors hover:text-gray-200 hover:bg-surface-lighter"
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {text}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-surface-border px-4 py-2.5">
              <p className="text-[11px] text-gray-600 text-center">
                Powered by AI intent understanding
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
