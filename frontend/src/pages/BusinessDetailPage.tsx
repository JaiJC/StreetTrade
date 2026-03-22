import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Camera,
  Smartphone,
  Sparkles,
  Calendar,
  Activity,
  Instagram,
  Facebook,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockBusinesses } from '../data/mockBusinesses';

// ─── Constants ────────────────────────────────────────────────────────────────

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function createGreenMarker(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #10b981;
      border: 3px solid #059669;
      box-shadow: 0 0 16px 4px rgba(16,185,129,0.5);
    "></div>`,
  });
}

// ─── Confidence Ring ──────────────────────────────────────────────────────────

function ConfidenceRing({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const radius = 54;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence * circumference);

  // Color based on confidence
  const color = confidence >= 0.9 ? '#10b981' : confidence >= 0.75 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth={stroke}
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{pct}%</span>
          <span className="text-xs text-gray-400">confidence</span>
        </div>
      </div>
    </div>
  );
}

// ─── Source Display ────────────────────────────────────────────────────────────

function SourceDisplay({ source }: { source: 'street_view' | 'social_media' | 'both' }) {
  const config = {
    street_view: { icon: Camera, label: 'Street View', color: 'text-blue-400' },
    social_media: { icon: Smartphone, label: 'Social Media', color: 'text-pink-400' },
    both: { icon: Sparkles, label: 'Multiple Sources', color: 'text-primary-light' },
  };
  const { icon: Icon, label, color } = config[source];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-12 h-12 rounded-xl bg-surface flex items-center justify-center ${color}`}>
        <Icon size={24} />
      </div>
      <span className="text-sm text-gray-300">{label}</span>
      <span className="text-xs text-gray-500">Detection Source</span>
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="relative aspect-video bg-gradient-to-br from-surface-light via-surface to-surface-light rounded-2xl overflow-hidden border border-surface-lighter">
      {/* Building silhouettes */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute bottom-0 left-[5%] w-[25%] h-[60%] bg-surface-lighter rounded-t-sm" />
        <div className="absolute bottom-0 left-[33%] w-[20%] h-[72%] bg-surface-lighter/80 rounded-t-sm" />
        <div className="absolute bottom-0 left-[56%] w-[22%] h-[55%] bg-surface-lighter/70 rounded-t-sm" />
        <div className="absolute bottom-0 right-[5%] w-[15%] h-[48%] bg-surface-lighter/60 rounded-t-sm" />
        <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-gray-700/50" />
      </div>

      {/* Awning shapes */}
      <div className="absolute top-[22%] left-[34%] w-[18%] h-[6%] bg-red-900/25 rounded-b-sm" />
      <div className="absolute top-[28%] left-[8%] w-[20%] h-[5%] bg-amber-900/20 rounded-b-sm" />

      {/* AI Detection Zone dashed overlay */}
      <div className="absolute top-[15%] left-[28%] w-[40%] h-[50%] border-2 border-dashed border-primary/60 rounded-lg">
        <span className="absolute -top-5 left-2 text-[10px] font-mono text-primary/80 bg-surface/80 px-1.5 py-0.5 rounded-sm">
          AI Detection Zone
        </span>
      </div>

      {/* Corner brackets */}
      {[
        'top-3 left-3 border-t-2 border-l-2',
        'top-3 right-3 border-t-2 border-r-2',
        'bottom-3 left-3 border-b-2 border-l-2',
        'bottom-3 right-3 border-b-2 border-r-2',
      ].map((pos) => (
        <div key={pos} className={`absolute ${pos} w-5 h-5 border-primary/40`} />
      ))}

      {/* Corner text: Street View coordinates */}
      <div className="absolute top-4 left-10 text-xs font-mono text-gray-500/70">
        Street View &middot; {lat.toFixed(4)}N {Math.abs(lng).toFixed(4)}W
      </div>

      {/* Detected badge bottom-right */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-surface/80 backdrop-blur-sm border border-primary/30 rounded-lg px-3 py-1.5">
        <Sparkles size={14} className="text-primary" />
        <span className="text-xs font-medium text-primary-light">Detected by StreetTrade AI</span>
      </div>

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
    </div>
  );
}

// ─── Social Card ──────────────────────────────────────────────────────────────

function SocialCard({
  icon: Icon,
  platform,
  color,
}: {
  icon: React.ElementType;
  platform: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-surface rounded-xl border border-surface-lighter p-4 hover:border-surface-lighter/80 transition-colors">
      <div className={`w-10 h-10 rounded-lg bg-surface-light flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-white">{platform}</span>
        <p className="text-xs text-gray-500">View Profile</p>
      </div>
      <ExternalLink size={14} className="text-gray-500" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const business = useMemo(() => mockBusinesses.find((b) => b.id === id), [id]);
  const markerIcon = useMemo(() => createGreenMarker(), []);

  if (!business) {
    return (
      <div className="min-h-screen bg-surface text-white flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-gray-300">Business not found</h1>
        <p className="text-gray-500">The business you are looking for does not exist or has been removed.</p>
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

  const discoveredDate = new Date(business.discoveredAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-surface text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ── Back navigation ── */}
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-primary transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to Search
        </Link>

        {/* ── Hero ── */}
        <HeroSection lat={business.lat} lng={business.lng} />

        {/* ── Business header ── */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-white">{business.name}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-surface-light border border-surface-lighter text-sm font-medium text-gray-300 capitalize">
              {business.category}
            </span>
            {business.onGoogle ? (
              <span className="px-3 py-1 rounded-full bg-gray-700/50 border border-gray-600 text-xs font-medium text-gray-400">
                Listed on Google
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-medium text-primary-light">
                StreetTrade Exclusive
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <MapPin size={16} className="text-primary shrink-0" />
            <span>{business.address}</span>
          </div>
        </div>

        {/* ── Info grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Confidence */}
          <div className="col-span-2 md:col-span-1 bg-surface-light rounded-2xl border border-surface-lighter p-6 flex justify-center">
            <ConfidenceRing confidence={business.confidence} />
          </div>

          {/* Detection Source */}
          <div className="bg-surface-light rounded-2xl border border-surface-lighter p-6 flex justify-center">
            <SourceDisplay source={business.source} />
          </div>

          {/* Discovered */}
          <div className="bg-surface-light rounded-2xl border border-surface-lighter p-6 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-accent">
              <Calendar size={24} />
            </div>
            <span className="text-sm text-gray-300 text-center">{discoveredDate}</span>
            <span className="text-xs text-gray-500">Discovered</span>
          </div>

          {/* Status */}
          <div className="bg-surface-light rounded-2xl border border-surface-lighter p-6 flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-primary">
              <Activity size={24} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-gray-300">Active</span>
            </div>
            <span className="text-xs text-gray-500">Status</span>
          </div>
        </div>

        {/* ── About ── */}
        <div className="bg-surface-light rounded-2xl border border-surface-lighter p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white">About</h2>
          <p className="text-gray-400 leading-relaxed">{business.description}</p>
        </div>

        {/* ── Tags ── */}
        <div className="bg-surface-light rounded-2xl border border-surface-lighter p-6 space-y-3">
          <h2 className="text-lg font-semibold text-white">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {business.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full bg-surface border border-surface-lighter text-sm text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── Online Presence ── */}
        <div className="bg-surface-light rounded-2xl border border-surface-lighter p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Online Presence</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {business.onGoogle && (
              <SocialCard icon={Globe} platform="Google Maps" color="text-red-400" />
            )}
            <SocialCard icon={Instagram} platform="Instagram" color="text-pink-400" />
            <SocialCard icon={Facebook} platform="Facebook" color="text-blue-400" />
          </div>
        </div>

        {/* ── Location Map ── */}
        <div className="bg-surface-light rounded-2xl border border-surface-lighter p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Location</h2>
          <div className="h-64 rounded-xl overflow-hidden border border-surface-lighter">
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
          </div>
        </div>
      </div>
    </div>
  );
}
