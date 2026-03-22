import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [storeType, setStoreType] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [distance, setDistance] = useState('');

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (storeType) params.set('type', storeType);
    if (neighborhood) params.set('neighborhood', neighborhood);
    if (distance) params.set('distance', distance);
    navigate(`/search?${params.toString()}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050810]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[150px]" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-full -translate-x-1/2 bg-gradient-to-t from-primary/[0.03] to-transparent" />
      </div>

      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 pt-24 pb-48 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-4 py-1.5 text-sm font-medium text-primary-light">
          <Sparkles size={14} />
          <span>AI-Powered Local Discovery</span>
        </div>

        {/* Heading */}
        <h1 className="max-w-4xl text-5xl leading-[1.08] font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Find What the{' '}
          <span className="text-primary-light">Map</span>
          {' '}Won&apos;t Show You
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 sm:text-xl">
          Uncover hidden gems, forgotten archives, and local secrets — powered
          by street-level AI that sees what others miss.
        </p>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="mt-10 w-full max-w-2xl"
        >
          <div className="flex items-center rounded-xl bg-white shadow-lg shadow-black/20">
            <div className="flex flex-1 items-center px-4">
              <Search size={20} className="shrink-0 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="dark academia vintage dresses within 2km..."
                className="w-full bg-transparent px-3 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                aria-label="Search query"
              />
            </div>
            <button
              type="submit"
              className="mr-1.5 flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              <Search size={16} />
              Search
            </button>
          </div>

          {/* Filter Dropdowns */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <FilterSelect
              value={storeType}
              onChange={setStoreType}
              placeholder="Store type"
              options={[
                'Vintage',
                'Bookstore',
                'Cafe',
                'Gallery',
                'Thrift',
                'Records',
                'Antiques',
              ]}
            />
            <FilterSelect
              value={neighborhood}
              onChange={setNeighborhood}
              placeholder="Neighborhood"
              options={[
                'Downtown',
                'Kensington',
                'Queen West',
                'Ossington',
                'Parkdale',
                'Junction',
                'Leslieville',
              ]}
            />
            <FilterSelect
              value={distance}
              onChange={setDistance}
              placeholder="Within km"
              options={['1 km', '2 km', '5 km', '10 km', '25 km']}
            />
          </div>
        </form>
      </section>

      {/* City Skyline Silhouette */}
      <div className="pointer-events-none absolute right-0 bottom-0 left-0">
        <svg
          viewBox="0 0 1440 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 220V180h40v-20h20v-30h10v30h30v-40h10v-10h20v10h10v40h20v-60h10v-20h20v20h10v60h30v-50h10v-30h20v30h10v50h20v-80h10v-10h10v-20h20v20h10v10h10v80h30v-100h10v-10h10v10h10v-30h20v30h10v100h20v-40h10v-60h10v-20h20v20h10v60h10v40h30v-70h10v-50h20v50h10v70h20v-30h10v-90h10v-30h20v30h10v90h10v30h30v-50h10v-20h20v20h10v-40h20v40h10v50h30v-60h10v-30h10v-10h20v10h10v30h10v60h20v-40h10v-80h20v80h10v40h30v-20h10v-30h20v30h10v20h20v-50h10v-10h10v10h10v-40h20v40h10v50h30v-30h10v-60h20v60h10v30h20v-20h10v-10h20v10h10v20h40V220z"
            fill="#0a0e17"
          />
          <path
            d="M0 220V190h40v-10h20v-20h10v20h30v-30h10v-5h20v5h10v30h20v-40h10v-15h20v15h10v40h30v-35h10v-20h20v20h10v35h20v-55h10v-5h10v-15h20v15h10v5h10v55h30v-70h10v-5h10v5h10v-20h20v20h10v70h20v-25h10v-40h10v-15h20v15h10v40h10v25h30v-45h10v-35h20v35h10v45h20v-20h10v-60h10v-20h20v20h10v60h10v20h30v-30h10v-10h20v10h10v-25h20v25h10v30h30v-40h10v-20h10v-5h20v5h10v20h10v40h20v-25h10v-55h20v55h10v25h30v-10h10v-20h20v20h10v10h20v-35h10v-5h10v5h10v-25h20v25h10v35h30v-15h10v-40h20v40h10v15h20v-10h10v-5h20v5h10v10h40V220z"
            fill="#080c14"
          />
          {/* Building window lights */}
          <g fill="#e88c0a" opacity="0.15">
            <rect x="95" y="170" width="3" height="4" rx="0.5" />
            <rect x="105" y="165" width="3" height="4" rx="0.5" />
            <rect x="175" y="150" width="3" height="4" rx="0.5" />
            <rect x="255" y="140" width="3" height="4" rx="0.5" />
            <rect x="345" y="135" width="3" height="4" rx="0.5" />
            <rect x="435" y="125" width="3" height="4" rx="0.5" />
            <rect x="445" y="135" width="3" height="4" rx="0.5" />
            <rect x="535" y="120" width="3" height="4" rx="0.5" />
            <rect x="625" y="145" width="3" height="4" rx="0.5" />
            <rect x="715" y="130" width="3" height="4" rx="0.5" />
            <rect x="805" y="140" width="3" height="4" rx="0.5" />
            <rect x="895" y="155" width="3" height="4" rx="0.5" />
            <rect x="985" y="135" width="3" height="4" rx="0.5" />
            <rect x="1075" y="150" width="3" height="4" rx="0.5" />
            <rect x="1165" y="145" width="3" height="4" rx="0.5" />
            <rect x="1255" y="160" width="3" height="4" rx="0.5" />
            <rect x="1345" y="150" width="3" height="4" rx="0.5" />
          </g>
          <g fill="#e88c0a" opacity="0.08">
            <rect x="100" y="178" width="3" height="4" rx="0.5" />
            <rect x="180" y="158" width="3" height="4" rx="0.5" />
            <rect x="260" y="148" width="3" height="4" rx="0.5" />
            <rect x="350" y="142" width="3" height="4" rx="0.5" />
            <rect x="440" y="132" width="3" height="4" rx="0.5" />
            <rect x="540" y="128" width="3" height="4" rx="0.5" />
            <rect x="630" y="152" width="3" height="4" rx="0.5" />
            <rect x="720" y="138" width="3" height="4" rx="0.5" />
            <rect x="810" y="148" width="3" height="4" rx="0.5" />
            <rect x="900" y="162" width="3" height="4" rx="0.5" />
            <rect x="990" y="142" width="3" height="4" rx="0.5" />
            <rect x="1080" y="158" width="3" height="4" rx="0.5" />
            <rect x="1170" y="152" width="3" height="4" rx="0.5" />
            <rect x="1260" y="168" width="3" height="4" rx="0.5" />
          </g>
        </svg>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Small filter select component                                       */
/* ------------------------------------------------------------------ */

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-surface-border bg-surface-light py-2 pr-8 pl-3 text-sm text-gray-300 transition-colors hover:border-primary/30 focus:border-primary/50 focus:outline-none"
        aria-label={placeholder}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-500"
      />
    </div>
  );
}
