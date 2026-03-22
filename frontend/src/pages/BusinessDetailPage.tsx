import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, ChevronRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockBusinesses } from '../data/mockBusinesses';

// ── Constants ────────────────────────────────────────────────────────────────

const DARK_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const EVIDENCE_TABS = [
  'Street View Evidence',
  'Registry Match',
  'Social Signals',
  'Web Presence',
] as const;

type EvidenceTab = (typeof EVIDENCE_TABS)[number];

function createOrangeMarker(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<div style="
      width:24px;height:24px;border-radius:50%;
      background:#e88c0a;border:3px solid #f59e0b;
      box-shadow:0 0 16px 4px rgba(232,140,10,0.45);
    "></div>`,
  });
}

// ── Confidence Bar ───────────────────────────────────────────────────────────

function ConfidenceBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-white">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-lighter overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection({
  lat,
  lng,
  confidence,
}: {
  lat: number;
  lng: number;
  confidence: number;
}) {
  const pct = Math.round(confidence * 100);

  return (
    <div className="grid grid-cols-5 gap-3 h-[320px]">
      {/* Left: Street view with AI detection boxes */}
      <div className="col-span-3 relative rounded-2xl overflow-hidden border border-surface-border bg-gradient-to-br from-[#0d1520] via-[#111d2e] to-[#0a1018]">
        {/* Simulated street imagery */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a2744]/60 via-[#0f1a2a]/40 to-[#060d16]/80" />
          {/* Building silhouettes */}
          <div className="absolute bottom-0 left-[3%] w-[30%] h-[65%] bg-[#131f30] rounded-t-sm" />
          <div className="absolute bottom-0 left-[36%] w-[25%] h-[78%] bg-[#101928] rounded-t-sm" />
          <div className="absolute bottom-0 left-[64%] w-[20%] h-[55%] bg-[#15202f] rounded-t-sm" />
          <div className="absolute bottom-0 right-[2%] w-[12%] h-[45%] bg-[#111c2b] rounded-t-sm" />
          {/* Awnings */}
          <div className="absolute top-[18%] left-[37%] w-[23%] h-[5%] bg-[#5c1a1a]/40 rounded-b-sm" />
          <div className="absolute top-[30%] left-[5%] w-[26%] h-[4%] bg-[#4a3010]/30 rounded-b-sm" />
          {/* Ground / sidewalk */}
          <div className="absolute bottom-0 left-0 right-0 h-[10%] bg-[#1a1f28]/60" />
          {/* Window lights */}
          <div className="absolute top-[30%] left-[40%] w-3 h-4 bg-amber-500/10 rounded-sm" />
          <div className="absolute top-[32%] left-[46%] w-3 h-4 bg-amber-500/8 rounded-sm" />
          <div className="absolute top-[25%] left-[8%] w-3 h-4 bg-blue-300/8 rounded-sm" />
        </div>

        {/* AI detection bounding boxes */}
        <div className="absolute top-[12%] left-[30%] w-[38%] h-[52%] border-2 border-green-400/70 rounded">
          <span className="absolute -top-5 left-1 text-[10px] font-mono text-green-400 bg-green-400/15 px-1.5 py-0.5 rounded-sm">
            storefront_sign 0.88
          </span>
        </div>
        <div className="absolute top-[42%] left-[6%] w-[22%] h-[30%] border-2 border-green-400/50 rounded">
          <span className="absolute -top-5 left-1 text-[10px] font-mono text-green-400/80 bg-green-400/10 px-1.5 py-0.5 rounded-sm">
            awning 0.74
          </span>
        </div>

        {/* Corner brackets */}
        {[
          'top-3 left-3 border-t-2 border-l-2',
          'top-3 right-3 border-t-2 border-r-2',
          'bottom-3 left-3 border-b-2 border-l-2',
          'bottom-3 right-3 border-b-2 border-r-2',
        ].map((pos) => (
          <div
            key={pos}
            className={`absolute ${pos} w-4 h-4 border-primary/40`}
          />
        ))}

        {/* Coordinates label */}
        <div className="absolute top-4 left-10 text-[11px] font-mono text-gray-500/70">
          {lat.toFixed(4)}N, {Math.abs(lng).toFixed(4)}W
        </div>

        {/* AI Detection badge */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-surface/85 backdrop-blur-sm border border-primary/30 rounded-lg px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-medium text-primary-light">
            AI Detection
          </span>
          <span className="text-[10px] text-gray-400 font-mono">
            &gt; {pct}% Confidence
          </span>
        </div>
      </div>

      {/* Right: Social media evidence */}
      <div className="col-span-2 relative rounded-2xl overflow-hidden border border-surface-border bg-gradient-to-br from-[#1a1025] via-[#12101f] to-[#0d0c18]">
        {/* Abstract social media visual */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-900/15 via-purple-900/10 to-transparent" />
          {/* Simulated post cards */}
          <div className="absolute top-[12%] left-[10%] right-[10%] h-[30%] bg-[#1a1630]/70 rounded-lg border border-purple-500/10">
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-pink-500/20" />
                <div className="h-2 w-16 bg-gray-600/30 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-600/20 rounded" />
              <div className="h-2 w-3/4 bg-gray-600/15 rounded" />
            </div>
          </div>
          <div className="absolute top-[48%] left-[10%] right-[10%] h-[30%] bg-[#1a1630]/50 rounded-lg border border-purple-500/8">
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/20" />
                <div className="h-2 w-20 bg-gray-600/25 rounded" />
              </div>
              <div className="h-2 w-full bg-gray-600/15 rounded" />
              <div className="h-2 w-1/2 bg-gray-600/10 rounded" />
            </div>
          </div>
          {/* Floating hearts / interactions */}
          <div className="absolute top-[20%] right-[8%] text-pink-500/30 text-lg">
            &hearts;
          </div>
          <div className="absolute top-[55%] right-[15%] text-pink-500/20 text-sm">
            &hearts;
          </div>
        </div>

        {/* Label */}
        <div className="absolute bottom-4 left-4 right-4">
          <span className="text-xs font-medium text-purple-300/70">
            Social Media Evidence
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Detection Detail Table ──────────────────────────────────────────────────

function DetectionDetails({ confidence }: { confidence: number }) {
  const pct = (confidence * 100).toFixed(1);
  const rows = [
    { label: 'Model', value: 'YOLOv8-Storefront v2.4' },
    { label: 'Confidence', value: `${pct}%`, highlight: true },
    { label: 'Detection Type', value: 'Storefront Signage' },
    { label: 'Bounding Box', value: '[256, 84, 890, 392]', mono: true },
    { label: 'Last Scanned', value: 'Mar 18, 2026' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Detection Details</h3>
      <div className="divide-y divide-surface-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-2.5"
          >
            <span className="text-sm text-gray-400">{row.label}</span>
            <span
              className={`text-sm font-medium ${
                row.highlight
                  ? 'text-primary-light'
                  : row.mono
                    ? 'font-mono text-gray-300'
                    : 'text-white'
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Street View Evidence (inside tab) ────────────────────────────────────────

function StreetViewEvidence({
  confidence,
  lat,
  lng,
}: {
  confidence: number;
  lat: number;
  lng: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: mini detection image */}
      <div className="relative rounded-xl overflow-hidden border border-surface-border bg-gradient-to-br from-[#0d1520] via-[#111d2e] to-[#0a1018] aspect-video">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a2744]/50 via-[#0f1a2a]/30 to-[#060d16]/70" />
          <div className="absolute bottom-0 left-[5%] w-[28%] h-[60%] bg-[#131f30] rounded-t-sm" />
          <div className="absolute bottom-0 left-[36%] w-[22%] h-[72%] bg-[#101928] rounded-t-sm" />
          <div className="absolute bottom-0 left-[62%] w-[18%] h-[50%] bg-[#15202f] rounded-t-sm" />
          <div className="absolute bottom-0 right-[4%] w-[14%] h-[42%] bg-[#111c2b] rounded-t-sm" />
          <div className="absolute bottom-0 left-0 right-0 h-[8%] bg-[#1a1f28]/50" />
        </div>
        {/* Bounding box */}
        <div className="absolute top-[14%] left-[28%] w-[42%] h-[48%] border-2 border-green-400/70 rounded">
          <span className="absolute -top-5 left-1 text-[9px] font-mono text-green-400 bg-green-400/15 px-1.5 py-0.5 rounded-sm">
            storefront_sign 0.88
          </span>
        </div>
        <div className="absolute top-4 left-4 text-[10px] font-mono text-gray-500/60">
          {lat.toFixed(4)}N, {Math.abs(lng).toFixed(4)}W
        </div>
      </div>

      {/* Right: detection details table */}
      <DetectionDetails confidence={confidence} />
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const business = useMemo(() => mockBusinesses.find((b) => b.id === id), [id]);
  const markerIcon = useMemo(() => createOrangeMarker(), []);
  const [activeTab, setActiveTab] = useState<EvidenceTab>(
    'Street View Evidence',
  );

  if (!business) {
    return (
      <div className="min-h-screen bg-surface text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-gray-300">
          Business not found
        </h1>
        <p className="text-gray-500">
          The business you are looking for does not exist or has been removed.
        </p>
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-light transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to Search
        </Link>
      </div>
    );
  }

  const confidencePct = Math.round(business.confidence * 100);

  // Simulated sub-scores for the confidence breakdown
  const confidenceBreakdown = [
    { label: 'Street View', value: Math.min(96, confidencePct + 8), color: '#e88c0a' },
    { label: 'Registry Match', value: Math.max(45, confidencePct - 10), color: '#3b82f6' },
    { label: 'Social Signals', value: Math.max(50, confidencePct - 4), color: '#d946ef' },
    { label: 'Web Presence', value: Math.max(30, confidencePct - 43), color: '#3b82f6' },
  ];

  return (
    <div className="min-h-screen bg-surface text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-primary transition-colors font-medium"
          >
            <ArrowLeft size={14} />
            Search Results
          </Link>
          <ChevronRight size={14} className="text-gray-600" />
          <span className="text-gray-300">Business Detail</span>
        </nav>

        {/* ── Hero ── */}
        <HeroSection
          lat={business.lat}
          lng={business.lng}
          confidence={business.confidence}
        />

        {/* ── Business Header ── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{business.name}</h1>
            <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-sm font-semibold text-primary-light">
              Phantom Business
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <MapPin size={16} className="text-primary shrink-0" />
            <span>{business.address}</span>
            <span className="text-gray-600 mx-1">&middot;</span>
            <span className="text-gray-500">1.2 mi away</span>
          </div>
        </div>

        {/* ── Evidence Analysis ── */}
        <section className="bg-surface-light rounded-2xl border border-surface-border overflow-hidden">
          <div className="px-6 pt-6 pb-0">
            <h2 className="text-lg font-semibold text-white mb-4">
              Evidence Analysis
            </h2>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-surface-border -mx-6 px-6">
              {EVIDENCE_TABS.map((tab) => {
                const isActive = tab === activeTab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
                      isActive
                        ? 'text-primary-light'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    {tab}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'Street View Evidence' && (
              <StreetViewEvidence
                confidence={business.confidence}
                lat={business.lat}
                lng={business.lng}
              />
            )}
            {activeTab === 'Registry Match' && (
              <div className="text-gray-500 text-sm py-8 text-center">
                Registry match data not yet available for this business.
              </div>
            )}
            {activeTab === 'Social Signals' && (
              <div className="text-gray-500 text-sm py-8 text-center">
                Social signals analysis is pending review.
              </div>
            )}
            {activeTab === 'Web Presence' && (
              <div className="text-gray-500 text-sm py-8 text-center">
                Web presence scan results will appear here.
              </div>
            )}
          </div>
        </section>

        {/* ── Confidence Breakdown ── */}
        <section className="bg-surface-light rounded-2xl border border-surface-border p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">
            Confidence Breakdown
          </h2>
          <div className="space-y-4">
            {confidenceBreakdown.map((item) => (
              <ConfidenceBar
                key={item.label}
                label={item.label}
                value={item.value}
                color={item.color}
              />
            ))}
          </div>
        </section>

        {/* ── Location Map ── */}
        <section className="bg-surface-light rounded-2xl border border-surface-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Location</h2>
          <div className="h-72 rounded-xl overflow-hidden border border-surface-border relative">
            <MapContainer
              center={[business.lat, business.lng]}
              zoom={16}
              className="h-full w-full"
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTR} />
              <Marker
                position={[business.lat, business.lng]}
                icon={markerIcon}
              />
            </MapContainer>
            {/* Floating label on map */}
            <div className="absolute top-4 left-4 z-[1000] bg-surface/90 backdrop-blur-sm border border-surface-border rounded-lg px-3 py-2 flex items-center gap-2 pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-xs font-medium text-white">
                {business.name}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
