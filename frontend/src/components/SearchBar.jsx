import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";

export default function SearchBar({
  query,
  onQueryChange,
  locationValue,
  onLocationChange,
  onSearch,
  onUseCurrentLocation,
  isLocating,
}) {
  return (
    <form className="space-y-3" onSubmit={onSearch}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder='What are you looking for? e.g. "thai food", "barbershop", "vintage clothing"'
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-slate-900 outline-none transition focus:border-streettrade-accent"
        />
      </div>

      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={locationValue}
          onChange={(event) => onLocationChange(event.target.value)}
          placeholder="Neighbourhood or address"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-40 text-slate-900 outline-none transition focus:border-streettrade-accent"
        />
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={isLocating}
          className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          Use my location
        </button>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-streettrade-ink px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Search
      </button>
    </form>
  );
}
