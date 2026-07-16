"use client";

import { useSyncExternalStore } from "react";

// Device-level map-style preference (like the theme and temperature unit, it
// lives in localStorage and applies on this device only). The app defaults to
// the monochrome basemap that matches its look; "color" opts into a full-colour
// basemap. Stored only when the user opts into colour.
export type MapStyle = "mono" | "color";

const STORAGE_KEY = "map-style";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function setMapStyle(style: MapStyle) {
  if (style === "color") localStorage.setItem(STORAGE_KEY, "color");
  else localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function useMapStyle(): MapStyle {
  return useSyncExternalStore(
    subscribe,
    () => (localStorage.getItem(STORAGE_KEY) === "color" ? "color" : "mono"),
    () => "mono"
  );
}
