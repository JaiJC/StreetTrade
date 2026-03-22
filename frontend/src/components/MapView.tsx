import { useCallback, useMemo, useState } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  InfoWindowF,
  CircleF,
} from '@react-google-maps/api';
import type { Business } from '../data/types';

interface MapViewProps {
  businesses: Business[];
  selectedId?: string;
  onSelect: (id: string) => void;
  center?: [number, number];
}

const VANCOUVER_CENTER: [number, number] = [49.27, -123.0724];

const GOOGLE_MAPS_API_KEY = 'AIzaSyB5r9qL1KKSIGUh7iQG-FLTaRB5ojk-XqM';

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px',
};

export default function MapView({
  businesses,
  selectedId,
  onSelect,
  center = VANCOUVER_CENTER,
}: MapViewProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [infoId, setInfoId] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const mapCenter = useMemo(
    () => ({ lat: center[0], lng: center[1] }),
    [center],
  );

  const onLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  // Fit bounds to show all businesses, or pan to selected
  useMemo(() => {
    if (!map) return;
    if (selectedId) {
      // Pan to selected business
      map.panTo(mapCenter);
      return;
    }
    // Auto-fit to show all business markers
    if (businesses.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      for (const biz of businesses) {
        bounds.extend({ lat: biz.lat, lng: biz.lng });
      }
      map.fitBounds(bounds, 50);
      // Don't zoom in too far if few results
      const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
        const z = map.getZoom();
        if (z && z > 16) map.setZoom(16);
        google.maps.event.removeListener(listener);
      });
    } else {
      map.panTo(mapCenter);
      map.setZoom(13);
    }
  }, [map, businesses, selectedId, mapCenter]);

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={13}
        onLoad={onLoad}
        options={{
          styles: [],
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          backgroundColor: '#f8f9fa',
        }}
      >
        {/* Search radius circle */}
        <CircleF
          center={mapCenter}
          radius={2000}
          options={{
            strokeColor: '#e88c0a',
            strokeWeight: 1.5,
            strokeOpacity: 0.5,
            fillColor: '#e88c0a',
            fillOpacity: 0.06,
          }}
        />

        {/* Business markers */}
        {businesses.map((biz) => {
          const isHidden = !biz.onGoogle;
          const isSelected = biz.id === selectedId;

          return (
            <MarkerF
              key={biz.id}
              position={{ lat: biz.lat, lng: biz.lng }}
              onClick={() => {
                onSelect(biz.id);
                setInfoId(biz.id);
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: isSelected ? 10 : 7,
                fillColor: isHidden ? '#e88c0a' : '#6b7280',
                fillOpacity: 1,
                strokeColor: isSelected
                  ? '#ffffff'
                  : isHidden
                    ? '#ca8a04'
                    : '#4b5563',
                strokeWeight: isSelected ? 3 : 2,
              }}
            >
              {infoId === biz.id && (
                <InfoWindowF
                  position={{ lat: biz.lat, lng: biz.lng }}
                  onCloseClick={() => setInfoId(null)}
                >
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      minWidth: '200px',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 4px',
                        fontWeight: 600,
                        fontSize: '14px',
                        color: '#111827',
                      }}
                    >
                      {biz.name}
                    </p>
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
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                          Confidence
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#e88c0a',
                          }}
                        >
                          {Math.round(biz.confidence * 100)}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: '4px',
                          borderRadius: '2px',
                          background: '#e5e7eb',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.round(biz.confidence * 100)}%`,
                            height: '100%',
                            borderRadius: '2px',
                            background: '#e88c0a',
                          }}
                        />
                      </div>
                    </div>

                    <a
                      href={`/business/${biz.id}`}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#e88c0a',
                        textDecoration: 'none',
                      }}
                    >
                      View Details →
                    </a>
                  </div>
                </InfoWindowF>
              )}
            </MarkerF>
          );
        })}
      </GoogleMap>

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 border border-gray-200 rounded-xl px-3.5 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-1.5 text-[11px] text-gray-600">
          <span className="w-2 h-2 rounded-full bg-[#e88c0a] inline-block" />
          <span>Hidden (AI discovered)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-600">
          <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
          <span>Known (on Google)</span>
        </div>
      </div>
    </div>
  );
}
