"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Navigation } from "lucide-react";

import { useThemeFamily } from "@/hooks/useThemeFamily";
import { useMapStyle } from "@/lib/mapStyle";

export interface MapPin {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  // Optional detail link shown in the pin's popup. Omitted on a project's own
  // detail page (you're already there) and reused generically elsewhere.
  href?: string;
  // "project" (a location) or "photo" (where a photo was taken). Controls the
  // marker shape and popup contents. Defaults to project.
  kind?: "project" | "photo";
  // Photo-only: a small preview and a one-line caption (who / when).
  thumbnail?: string;
  subtitle?: string;
}

// CartoDB basemaps (no API key; attribution required and provided). Monochrome
// (light/dark pair, follows the theme) matches the app's look; a "color" device
// setting swaps in the full-colour Voyager basemap instead. Voyager is a single
// light-toned style, so it's used for both themes in colour mode.
const TILES = {
  mono: {
    light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  },
  color: {
    light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    dark: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  },
} as const;

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Plain HTML markers avoid Leaflet's default image assets (which break under
// bundlers). Both invert with the theme so they stay legible on either basemap:
// a project is a round dot, a photo is a rounded square with a camera glyph so
// the two kinds read apart at a glance.
function makeProjectIcon(family: "light" | "dark") {
  const fill = family === "dark" ? "#fafafa" : "#171717";
  const ring = family === "dark" ? "#0a0a0a" : "#ffffff";
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${fill};border:2px solid ${ring};box-shadow:0 1px 4px rgba(0,0,0,0.45)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function makePhotoIcon(family: "light" | "dark") {
  const fill = family === "dark" ? "#fafafa" : "#171717";
  const ring = family === "dark" ? "#0a0a0a" : "#ffffff";
  const camera = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="${ring}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:${fill};border:2px solid ${ring};box-shadow:0 1px 4px rgba(0,0,0,0.45)">${camera}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
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
  const mapStyle = useMapStyle();
  const projectIcon = useMemo(() => makeProjectIcon(family), [family]);
  const photoIcon = useMemo(() => makePhotoIcon(family), [family]);

  const center: [number, number] = pins.length
    ? [pins[0].latitude, pins[0].longitude]
    : [39.5, -98.35]; // continental US fallback

  // A lone project pin (a project's own map) gets a one-tap "Directions" to
  // navigate there; otherwise directions live in each pin's popup.
  const single =
    pins.length === 1 && pins[0].kind !== "photo" ? pins[0] : null;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={pins.length ? 12 : 4}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          key={`${mapStyle}-${family}`}
          attribution={ATTRIBUTION}
          url={TILES[mapStyle][family]}
        />
        <FitBounds pins={pins} />
        {pins.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={p.kind === "photo" ? photoIcon : projectIcon}
          >
            <Popup>
              <span className="flex flex-col gap-1">
                {p.kind === "photo" && p.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail}
                    alt=""
                    width={150}
                    className="mb-0.5 h-24 w-[150px] rounded-md object-cover"
                  />
                )}
                {p.href ? (
                  <a href={p.href} className="font-medium">
                    {p.name}
                  </a>
                ) : (
                  <span className="font-medium">{p.name}</span>
                )}
                {p.subtitle && <span className="text-xs">{p.subtitle}</span>}
                {p.kind !== "photo" && (
                  <a
                    href={directionsUrl(p.latitude, p.longitude)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs"
                  >
                    <Navigation className="h-3 w-3" />
                    Directions
                  </a>
                )}
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
