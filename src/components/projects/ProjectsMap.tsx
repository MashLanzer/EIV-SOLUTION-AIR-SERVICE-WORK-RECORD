"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

export interface MapPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// A plain HTML dot avoids Leaflet's default marker image assets (which break
// under bundlers) - no extra files, and it matches the monochrome look.
const pinIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#171717;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.45)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 14);
      return;
    }
    const bounds = L.latLngBounds(
      pins.map((p) => [p.latitude, p.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, pins]);
  return null;
}

export default function ProjectsMap({ pins }: { pins: MapPin[] }) {
  const center: [number, number] = pins.length
    ? [pins[0].latitude, pins[0].longitude]
    : [39.5, -98.35]; // continental US fallback

  return (
    <MapContainer
      center={center}
      zoom={pins.length ? 12 : 4}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins} />
      {pins.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pinIcon}>
          <Popup>
            <a href={`/admin/projects/${p.id}`} className="font-medium">
              {p.name}
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
