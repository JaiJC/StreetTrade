import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import RadiusSlider from "../components/RadiusSlider";
import { CATEGORIES } from "../lib/categories";

const DEFAULT_LOCATION = { lat: 49.2635, lng: -123.0735 };

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState(1.5);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationLabel, setLocationLabel] = useState("Commercial Drive, Vancouver");
  const [locationInput, setLocationInput] = useState("Commercial Drive, Vancouver");
  const [isLocating, setIsLocating] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  async function reverseGeocode(lat, lng) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
    if (!response.ok) {
      throw new Error("Reverse geocode failed");
    }
    const data = await response.json();
    const address = data.address || {};
    const neighbourhood =
      address.neighbourhood ||
      address.suburb ||
      address.city_district ||
      address.hamlet ||
      address.village ||
      address.town ||
      address.city;
    const city = address.city || address.town || address.village || address.state;
    return neighbourhood && city ? `${neighbourhood}, ${city}` : neighbourhood || data.display_name || "Current location";
  }

  function submitSearch(searchQuery, options = {}) {
    const params = new URLSearchParams({
      query: searchQuery,
      lat: String(location.lat),
      lng: String(location.lng),
      radius_km: String(radiusKm),
    });
    if (options.exclusiveOnly) {
      params.set("exclusive", "1");
      params.set("category_label", "Specialty & Unique");
    }
    if (options.categoryLabel) {
      params.set("category_label", options.categoryLabel);
    }
    navigate(`/results?${params.toString()}#results`);
  }

  function onSearch(event) {
    event.preventDefault();
    submitSearch(query);
  }

  function onUseCurrentLocation() {
    if (!navigator.geolocation) {
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        setLocation({
          lat: nextLat,
          lng: nextLng,
        });
        try {
          const place = await reverseGeocode(nextLat, nextLng);
          setLocationLabel(place);
          setLocationInput(place);
        } catch (_error) {
          setLocationLabel("Current location");
          setLocationInput("Current location");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
      }
    );
  }

  function onLocationInputChange(value) {
    setLocationInput(value);
    setLocationLabel(value || "Commercial Drive, Vancouver");
  }

  function onCategoryClick(category) {
    const isSameChip = activeCategory === category.label;
    if (isSameChip) {
      setActiveCategory("");
      return;
    }
    setActiveCategory(category.label);
    setQuery(category.label);
    const exclusiveOnly = category.label === "Specialty & Unique";
    submitSearch(exclusiveOnly ? "" : category.query, {
      exclusiveOnly,
      categoryLabel: category.label,
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-8 text-white">
        <p className="mb-2 inline-block rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
          AI discovery engine
        </p>
        <h1 className="mb-3 text-3xl font-bold">Find local businesses Google misses</h1>
        <p className="mb-6 max-w-3xl text-sm text-slate-100">
          StreetTrade proactively discovers storefronts from street-level imagery, classifies
          them with VLMs, and ranks opportunities near you.
        </p>
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          locationValue={locationInput}
          onLocationChange={onLocationInputChange}
          onSearch={onSearch}
          onUseCurrentLocation={onUseCurrentLocation}
          isLocating={isLocating}
        />
        <p className="mt-3 text-sm text-slate-200">Searching around: {locationLabel}</p>
        <div className="mt-5">
          <RadiusSlider radiusKm={radiusKm} onChange={setRadiusKm} />
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={() => setShowHowItWorks((prev) => !prev)}
          className="text-left text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          How does StreetTrade find these businesses? →
        </button>
        {showHowItWorks && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold">📸 We scan street imagery</p>
              <p className="mt-1 text-xs text-slate-600">Mapillary + Google Street View</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold">🤖 AI reads every storefront</p>
              <p className="mt-1 text-xs text-slate-600">Vision models extract names + categories</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold">🔍 We check what Google knows</p>
              <p className="mt-1 text-xs text-slate-600">Cross-reference with Yelp, Foursquare, OSM</p>
            </article>
            <article className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold">✨ You find what others miss</p>
              <p className="mt-1 text-xs text-slate-600">StreetTrade exclusives get gold badges</p>
            </article>
          </div>
        )}
      </section>
      <section>
        <p className="mb-3 text-sm font-semibold text-slate-700">Or browse by category</p>
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((category) => {
            const active = activeCategory === category.label;
            const isSpecial = category.label === "Specialty & Unique";
            return (
              <button
                key={category.label}
                type="button"
                onClick={() => onCategoryClick(category)}
                title={isSpecial ? "These businesses can't be found on Google" : undefined}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-gray-200 bg-white text-slate-700 hover:bg-gray-50"
                }`}
              >
                <span className="mr-2">{category.emoji}</span>
                {category.label}
                {isSpecial && <span className="ml-1">✨</span>}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
