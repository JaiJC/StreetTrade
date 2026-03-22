import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import type { Category } from '../data/types';
import { mockBusinesses, categories } from '../data/mockBusinesses';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSelectBusiness?: (id: string) => void;
}

interface Suggestion {
  type: 'business' | 'category' | 'tag';
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
  exclusive?: boolean;
}

export default function SearchBar({ onSearch, onSelectBusiness }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const suggestions = getSuggestions(query);

  function getSuggestions(q: string): Suggestion[] {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) return [];

    const results: Suggestion[] = [];

    // Business matches (max 5)
    const bizMatches = mockBusinesses
      .filter((b) => b.name.toLowerCase().includes(trimmed))
      .slice(0, 5)
      .map((b): Suggestion => ({
        type: 'business',
        id: b.id,
        label: b.name,
        sublabel: b.category,
        exclusive: !b.onGoogle,
      }));
    results.push(...bizMatches);

    // Category matches (max 2)
    const catMatches = categories
      .filter((c) => c.value !== 'all' && c.label.toLowerCase().includes(trimmed))
      .slice(0, 2)
      .map((c): Suggestion => ({
        type: 'category',
        id: c.value,
        label: `Search all ${c.label}`,
        icon: c.icon,
      }));
    results.push(...catMatches);

    // Tag matches (max 1)
    const allTags = new Set(mockBusinesses.flatMap((b) => b.tags));
    const tagMatch = [...allTags].find((t) => t.toLowerCase().includes(trimmed));
    if (tagMatch) {
      results.push({
        type: 'tag',
        id: tagMatch,
        label: `Search '${tagMatch}' in all businesses`,
      });
    }

    return results.slice(0, 8);
  }

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.type === 'business') {
        setQuery(suggestion.label);
        onSelectBusiness?.(suggestion.id);
      } else {
        const searchTerm = suggestion.type === 'category' ? suggestion.id : suggestion.id;
        setQuery('');
        onSearch(searchTerm);
      }
      setShowDropdown(false);
      setHighlightedIndex(-1);
    },
    [onSearch, onSelectBusiness],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        onSearch(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        } else {
          onSearch(query);
          setShowDropdown(false);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(val.trim().length >= 1);
    setHighlightedIndex(-1);
  };

  const handleFocus = () => {
    if (query.trim().length >= 1) {
      setShowDropdown(true);
    }
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 150);
  };

  const handleClear = () => {
    setQuery('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
    onSearch('');
  };

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cleanup blur timeout
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search hidden businesses near you..."
          className="w-full pl-12 pr-12 py-3.5 bg-surface-light border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-lg shadow-black/20 transition-all text-sm"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-activedescendant={
            highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
          }
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <ul
          className="absolute z-50 w-full mt-1.5 bg-surface-light border border-surface-lighter rounded-xl shadow-2xl shadow-black/40 overflow-hidden py-1"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.type}-${suggestion.id}`}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm ${
                highlightedIndex === index
                  ? 'bg-surface-lighter'
                  : 'hover:bg-surface-lighter'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(suggestion);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion.type === 'business' && (
                <>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      suggestion.exclusive ? 'bg-primary' : 'bg-gray-500'
                    }`}
                  />
                  <span className="text-white truncate">{suggestion.label}</span>
                  <span className="ml-auto text-xs text-gray-500 capitalize flex-shrink-0">
                    {suggestion.sublabel}
                  </span>
                </>
              )}
              {suggestion.type === 'category' && (
                <>
                  <span className="text-base leading-none flex-shrink-0">
                    {suggestion.icon}
                  </span>
                  <span className="text-gray-300">{suggestion.label}</span>
                </>
              )}
              {suggestion.type === 'tag' && (
                <>
                  <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-300">{suggestion.label}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
