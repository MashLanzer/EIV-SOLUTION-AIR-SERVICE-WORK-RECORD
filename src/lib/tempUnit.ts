"use client";

import { useSyncExternalStore } from "react";

// Device-level temperature-unit preference (like theme, it lives in
// localStorage and applies on this device only). Fahrenheit is the default,
// so it's stored only when the user opts into Celsius.
export type TempUnit = "F" | "C";

const STORAGE_KEY = "temp-unit";

// A tiny same-tab store so a change in Settings updates any mounted weather
// card live; the "storage" event covers other tabs. useSyncExternalStore
// keeps SSR/hydration clean (server + first client render both read "F").
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

export function setTempUnit(unit: TempUnit) {
  if (unit === "C") localStorage.setItem(STORAGE_KEY, "C");
  else localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function useTempUnit(): TempUnit {
  return useSyncExternalStore(
    subscribe,
    () => (localStorage.getItem(STORAGE_KEY) === "C" ? "C" : "F"),
    () => "F"
  );
}

// The API always returns Fahrenheit; convert to the chosen unit for display.
export function toUnit(fahrenheit: number, unit: TempUnit): number {
  return unit === "C"
    ? Math.round(((fahrenheit - 32) * 5) / 9)
    : Math.round(fahrenheit);
}
