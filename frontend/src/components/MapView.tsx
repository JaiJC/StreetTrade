import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Camera, Instagram, Eye } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import 'leaflet/dist/leaflet.css';
import type { Business } from '../data/types';

interface MapViewProps {
  businesses: Business[];
  selectedId?: string;
  onSelect: (id: string) => void;
  center?: [number, number];
}

const VANCOUVER_CENTER: [number, number] = [49.27, -123.0724];
const DARK_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

/* ------------------------------------------------------------------ */
/*  Marker icons                                                       */
/* ------------------------------------------------------------------ */

function createMarkerIcon(isHidden: boolean, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 18 : 12;
  const color = isHidden ? '#e88c0a' : '#6b7280';
  const borderColor = isSelected
    ? '#ffffff'
    : isHidden
      ? '#ca8a04'
      : '#4b5563';
  const shadow = isSelected
    ? `0 0 12px 4px ${isHidden ? 'rgba(232,140,10,0.5)' : 'rgba(107,114,128,0.5)'}`
    : 'none';

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid ${borderColor};
      box-shadow: ${shadow};
      transition: all 0.2s ease;
    "></div>`,
  });
}

/* ------------------------------------------------------------------ */
/*  Source icons helper (rendered as static markup for popup)           */
/* ------------------------------------------------------------------ */

function sourceIconsMarkup(source: Business['source']) {
  const icons: string[] = [];
  if (source === 'street_view' || source === 'both') {
    icons.push(
      renderToStaticMarkup(
        <Camera className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />,
      ),
    );
  }
  if (source === 'social_media' || source === 'both') {
    icons.push(
      renderToStaticMarkup(
        <Instagram className="w-3.5 h-3.5" style={{ color: '#f472b6' }} />,
      ),
    );
  }
  return icons.join('');
}

/* ------------------------------------------------------------------ */
/*  Map controller                                                     */
/* ------------------------------------------------------------------ */

function MapFlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  const prevCenter = useRef(center);

  useEffect(() => {
    if (
      center[0] !== prevCenter.current[0] ||
      center[1] !== prevCenter.current[1]
    ) {
      map.flyTo(center, 15, { duration: 0.8 });
      prevCenter.current = center;
    }
  }, [center, map]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Legend overlay                                                     */
/* ------------------------------------------------------------------ */

function Legend() {
  const map = useMap();

  useEffect(() => {
    const legend = new L.Control({ position: 'bottomleft' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', '');
      div.innerHTML = `
        <div style="
          background: rgba(10,14,23,0.9);
          border: 1px solid #1e2a3a;
          border-radius: 10px;
          padding: 10px 14px;
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          color: #9ca3af;
          backdrop-filter: blur(8px);
        ">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#e88c0a;display:inline-block;"></span>
            <span>Hidden (AI discovered)</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#6b7280;display:inline-block;"></span>
            <span>Known (on Google)</span>
          </div>
        </div>
      `;
      return div;
    };

    legend.addTo(map);
    return () => {
      legend.remove();
    };
  }, [map]);

  return null;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function MapView({
  businesses,
  selectedId,
  onSelect,
  center = VANCOUVER_CENTER,
}: MapViewProps) {
  const markers = useMemo(
    () =>
      businesses.map((biz) => ({
        biz,
        icon: createMarkerIcon(!biz.onGoogle, biz.id === selectedId),
        position: [biz.lat, biz.lng] as [number, number],
      })),
    [businesses, selectedId],
  );

  const confidencePct = (c: number) => Math.round(c * 100);

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom
      className="h-full w-full rounded-xl overflow-hidden"
      style={{ minHeight: '400px' }}
    >
      <TileLayer url={DARK_TILE_URL} attribution={DARK_TILE_ATTR} />
      <MapFlyTo center={center} />
      <Legend />

      {/* 2 km radius circle */}
      <Circle
        center={center}
        radius={2000}
        pathOptions={{
          color: '#e88c0a',
          weight: 1.5,
          opacity: 0.5,
          fillColor: '#e88c0a',
          fillOpacity: 0.06,
          dashArray: '6 4',
        }}
      />

      {markers.map(({ biz, icon, position }) => (
        <Marker
          key={biz.id}
          position={position}
          icon={icon}
          eventHandlers={{ click: () => onSelect(biz.id) }}
        >
          <Popup className="dark-popup">
            <div
              style={{
                background: '#0f1724',
                border: '1px solid #1e2a3a',
                borderRadius: '12px',
                padding: '14px 16px',
                minWidth: '200px',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {/* Name */}
              <p
                style={{
                  margin: '0 0 4px',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: '#ffffff',
                }}
              >
                {biz.name}
              </p>

              {/* Category */}
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: '11px',
                  color: '#6b7280',
                  textTransform: 'capitalize',
                }}
              >
                {biz.category}
              </p>

              {/* Confidence bar */}
              <div style={{ marginBottom: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Confidence
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#e88c0a',
                    }}
                  >
                    {confidencePct(biz.confidence)}%
                  </span>
                </div>
                <div
                  style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: '#1a2332',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${confidencePct(biz.confidence)}%`,
                      height: '100%',
                      borderRadius: '2px',
                      background: '#e88c0a',
                    }}
                  />
                </div>
              </div>

              {/* Source icons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
                  dangerouslySetInnerHTML={{
                    __html: sourceIconsMarkup(biz.source),
                  }}
                />
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelect(biz.id);
                  }}
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#e88c0a',
                    textDecoration: 'none',
                  }}
                >
                  View Details &rarr;
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
