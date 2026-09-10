"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icon references image files by a relative path
// that only resolves in its own package layout — bundled through webpack it
// 404s and the marker renders as a blank square. Pointing it at the CDN
// copies (same version as the installed package ships) is the standard fix.
const markerIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Riyadh — a sane default centre when a branch has no pin yet, rather than
// opening on the middle of the ocean at (0, 0).
const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * The interactive part of the branch location picker — split out so it can
 * be loaded with `next/dynamic({ ssr: false })`, since Leaflet touches
 * `window` at import time and breaks server rendering otherwise.
 */
export function BranchLocationMap({
  initialLat,
  initialLng,
  onChange,
}: {
  initialLat: number | null;
  initialLng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const [position, setPosition] = useState<[number, number]>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : DEFAULT_CENTER,
  );

  function place(lat: number, lng: number) {
    setPosition([lat, lng]);
    onChange(lat, lng);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-admin-border" style={{ height: 320 }}>
      <MapContainer center={position} zoom={initialLat != null ? 15 : 11} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace onPick={place} />
        <Marker
          position={position}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target as L.Marker;
              const { lat, lng } = m.getLatLng();
              place(lat, lng);
            },
          }}
        />
      </MapContainer>
    </div>
  );
}
