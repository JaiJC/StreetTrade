import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Business } from '../data/types';

interface MapViewProps {
  businesses: Business[];
  selectedId?: string;
  onSelect: (id: string) => void;
  center?: [number, number];
}

const VANCOUVER_CENTER: [number, number] = [49.27, -123.0724];
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function createMarkerIcon(isExclusive: boolean, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 18 : 12;
  const color = isExclusive ? '#10b981' : '#6b7280';
  const borderColor = isSelected ? '#ffffff' : isExclusive ? '#059669' : '#4b5563';
  const shadow = isSelected
    ? `0 0 12px 4px ${isExclusive ? 'rgba(16,185,129,0.5)' : 'rgba(107,114,128,0.5)'}`
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

/** Fly the map to a new center when the `center` prop changes. */
function MapFlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  const prevCenter = useRef(center);

  useEffect(() => {
    if (center[0] !== prevCenter.current[0] || center[1] !== prevCenter.current[1]) {
      map.flyTo(center, 15, { duration: 0.8 });
      prevCenter.current = center;
    }
  }, [center, map]);

  return null;
}

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

      {markers.map(({ biz, icon, position }) => (
        <Marker
          key={biz.id}
          position={position}
          icon={icon}
          eventHandlers={{ click: () => onSelect(biz.id) }}
        >
          <Popup className="dark-popup">
            <div className="text-sm min-w-[180px]">
              <p className="font-semibold text-gray-900 mb-0.5">{biz.name}</p>
              <p className="text-gray-500 text-xs capitalize mb-1">{biz.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  Confidence: {Math.round(biz.confidence * 100)}%
                </span>
                {!biz.onGoogle && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    Exclusive
                  </span>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
