import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import BusinessMap from "../components/BusinessMap";
import ResultCard from "../components/ResultCard";
import {
  fetchDiscoverStatus,
  searchBusinesses,
  triggerDiscover,
} from "../lib/api";

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return r * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function ResultsPage() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const resultsSectionRef = useRef(null);
  const cardRefs = useRef({});
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [onlyExclusive, setOnlyExclusive] = useState(params.get("exclusive") === "1");

  const query = params.get("query") || "";
  const lat = Number(params.get("lat") || 49.2635);
  const lng = Number(params.get("lng") || -123.0735);
  const radiusKm = Number(params.get("radius_km") || 1.5);
  const categoryLabel = params.get("category_label") || "";

  const searchQuery = useQuery({
    queryKey: ["search", query, lat, lng, radiusKm],
    queryFn: () => searchBusinesses({ query, lat, lng, radiusKm }),
  });

  const discoverMutation = useMutation({
    mutationFn: () => triggerDiscover({ lat, lng, radius_km: radiusKm }),
  });

  const statusQuery = useQuery({
    queryKey: ["discover-status", discoverMutation.data?.job_id],
    queryFn: () => fetchDiscoverStatus(discoverMutation.data.job_id),
    enabled: Boolean(discoverMutation.data?.job_id),
    refetchInterval: (queryData) =>
      ["completed", "failed"].includes(queryData?.state?.data?.status) ? false : 3000,
  });

  const businesses = searchQuery.data || [];
  const visibleBusinesses = useMemo(
    () => (onlyExclusive ? businesses.filter((business) => !business.already_on_google) : businesses),
    [businesses, onlyExclusive]
  );

  const businessesWithDistance = useMemo(
    () =>
      visibleBusinesses.map((business) => ({
        business,
        distanceKm: haversineKm(lat, lng, business.lat, business.lng),
      })),
    [visibleBusinesses, lat, lng]
  );

  const status = statusQuery.data;
  const exclusiveCount = businesses.filter((business) => !business.already_on_google).length;

  useEffect(() => {
    if (window.location.hash === "#results" && resultsSectionRef.current) {
      resultsSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    if (status?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["search", query, lat, lng, radiusKm] });
    }
  }, [status?.status, queryClient, query, lat, lng, radiusKm]);

  function handleMarkerClick(businessId) {
    setSelectedBusinessId(businessId);
    const card = cardRefs.current[businessId];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function handleCardClick(businessId) {
    setSelectedBusinessId(businessId);
  }

  return (
    <div className="space-y-5" ref={resultsSectionRef} id="results">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Discovery Results</h1>
            <p className="text-sm text-slate-600">
              Query:{" "}
              <span className="font-medium">{categoryLabel || query || "all businesses"}</span> within{" "}
              {radiusKm.toFixed(1)} km
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              discoverMutation.mutate(undefined, {
                onSuccess: () => queryClient.invalidateQueries({ queryKey: ["search"] }),
              })
            }
            className="rounded-xl bg-streettrade-ink px-4 py-2 text-sm font-semibold text-white"
          >
            Run discovery in this area
          </button>
        </div>
        {status && (
          <p className="mt-3 text-sm text-slate-600">
            Job status: <span className="font-medium">{status.status}</span> ({status.progress}%)
          </p>
        )}
      </section>
      {!searchQuery.isLoading && !searchQuery.isError && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <span className="font-medium">{businesses.length} businesses found</span>
          <span className="mx-2 text-slate-400">·</span>
          <button
            type="button"
            onClick={() => setOnlyExclusive((prev) => !prev)}
            className="font-semibold text-amber-600 hover:text-amber-700"
          >
            ✨ {exclusiveCount} exclusive to StreetTrade
          </button>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_1.45fr]">
        <div className="max-h-[560px] space-y-3 overflow-auto pr-1">
          {searchQuery.isLoading && <p className="text-sm text-slate-600">Loading results...</p>}
          {searchQuery.isError && (
            <p className="text-sm text-red-600">
              Search failed. Make sure the backend is running at VITE_API_URL.
            </p>
          )}
          {businessesWithDistance.map(({ business, distanceKm }) => (
            <div
              key={business.id}
              ref={(node) => {
                if (node) cardRefs.current[business.id] = node;
              }}
            >
              <ResultCard
                business={business}
                distanceKm={distanceKm}
                isSelected={selectedBusinessId === business.id}
                onSelect={handleCardClick}
              />
            </div>
          ))}
          {!searchQuery.isLoading && businessesWithDistance.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              <p className="text-3xl">🏪</p>
              <p className="mt-2 text-base font-semibold text-slate-800">
                No businesses discovered here yet
              </p>
              <p className="mt-1">
                StreetTrade hasn't scanned this area. Trigger a discovery scan below.
              </p>
              <button
                type="button"
                onClick={() => discoverMutation.mutate()}
                className="mt-4 rounded-xl bg-streettrade-ink px-4 py-2 text-sm font-semibold text-white"
              >
                Scan this area
              </button>
              {status && (
                <p className="mt-2 text-xs text-slate-500">
                  Scan progress: {status.status} ({status.progress}%)
                </p>
              )}
            </div>
          )}
        </div>
        <BusinessMap
          businesses={visibleBusinesses}
          center={{ lat, lng }}
          radiusKm={radiusKm}
          selectedBusinessId={selectedBusinessId}
          onMarkerClick={handleMarkerClick}
        />
      </section>
    </div>
  );
}
