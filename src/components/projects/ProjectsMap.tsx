"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Navigation } from "lucide-react";

import { useThemeFamily } from "@/hooks/useThemeFamily";

export interface MapPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  // Optional detail link shown in the pin's popup. Omitted on a project's own
  // detail page (you're already there) and reused generically elsewhere.
  href?: string;
}

// CartoDB's greyscale basemaps match the app's monochrome look far better than
// OpenStreetMap's full-colour tiles, and come in a light + dark pair so the map
// follows the theme. No API key required; attribution is required and provided.
const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
} as const;

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// A plain HTML dot avoids Leaflet's default marker image assets (which break
// under bundlers). The fill inverts with the theme so the pin stays legible on
// both the light and dark basemap.
function makePinIcon(family: "light" | "dark") {
  const fill = family === "dark" ? "#fafafa" : "#171717";
  const ring = family === "dark" ? "#0a0a0a" : "#ffffff";
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${fill};border:2px solid ${ring};box-shadow:0 1px 4px rgba(0,0,0,0.45)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

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
  const family = useThemeFamily();
  const icon = useMemo(() => makePinIcon(family), [family]);

  const center: [number, number] = pins.length
    ? [pins[0].latitude, pins[0].longitude]
    : [39.5, -98.35]; // continental US fallback

  // With a single pin (a project's own map) offer a one-tap "Directions" to
  // navigate there; with many, directions live in each pin's popup instead.
  const single = pins.length === 1 ? pins[0] : null;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={pins.length ? 12 : 4}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer key={family} attribution={ATTRIBUTION} url={TILES[family]} />
        <FitBounds pins={pins} />
        {pins.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={icon}>
            <Popup>
              <span className="flex flex-col gap-1">
                {p.href ? (
                  <a href={p.href} className="font-medium">
                    {p.name}
                  </a>
                ) : (
                  <span className="font-medium">{p.name}</span>
                )}
                <a
                  href={directionsUrl(p.latitude, p.longitude)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs"
                >
                  <Navigation className="h-3 w-3" />
                  Directions
                </a>
              </span>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {single && (
        <a
          href={directionsUrl(single.latitude, single.longitude)}
          target="_blank"
          rel="noreferrer"
          className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 px-2.5 py-1.5 text-xs font-medium text-neutral-900 dark:text-neutral-100 shadow-md backdrop-blur transition-colors hover:bg-white dark:hover:bg-neutral-800 active:scale-95"
        >
          <Navigation className="h-3.5 w-3.5" />
          Directions
        </a>
      )}
    </div>
  );
}
