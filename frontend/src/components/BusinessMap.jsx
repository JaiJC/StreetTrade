import { useMemo } from "react";
import { divIcon } from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

function markerIcon(isExclusive, isSelected) {
  const className = [
    "streettrade-marker",
    isExclusive ? "streettrade-marker-exclusive" : "streettrade-marker-known",
    isSelected ? "streettrade-marker-selected" : "",
  ]
    .join(" ")
    .trim();
  return divIcon({
    className: "streettrade-marker-wrap",
    html: `<span class="${className}">${isExclusive ? "✨" : ""}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -20],
  });
}

export default function BusinessMap({
  businesses,
  center,
  radiusKm,
  selectedBusinessId,
  onMarkerClick,
}) {
  const mapCenter = [center.lat || 49.2635, center.lng || -123.0735];
  const radiusMeters = radiusKm * 1000;
  const markerIcons = useMemo(
    () =>
      Object.fromEntries(
        businesses.map((business) => [
          business.id,
          markerIcon(!business.already_on_google, selectedBusinessId === business.id),
        ])
      ),
    [businesses, selectedBusinessId]
  );

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <MapContainer
        key={`${mapCenter[0]}-${mapCenter[1]}-${radiusKm}`}
        center={mapCenter}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={mapCenter}
          radius={radiusMeters}
          pathOptions={{ color: "#0ea5e9", fillColor: "#bae6fd", fillOpacity: 0.18 }}
        />
        {businesses.map((business) => (
          <Marker
            key={business.id}
            center={[business.lat, business.lng]}
            icon={markerIcons[business.id]}
            eventHandlers={{
              click: () => onMarkerClick?.(business.id),
            }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{business.name}</p>
                <p className="text-xs text-slate-600">{business.category}</p>
                <p className="text-xs text-slate-500">{business.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
