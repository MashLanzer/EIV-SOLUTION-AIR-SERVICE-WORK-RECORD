"use client";

import { useSyncExternalStore } from "react";

// The resolved base theme family — "light" or "dark" — regardless of how it was
// chosen. Explicit themes set data-theme on <html> (custom palettes resolve to
// their family there too); "System" leaves it unset and defers to the OS. This
// hook reads whichever applies and stays in sync when either changes, so
// client widgets that can't use CSS variables (e.g. a Leaflet map's tiles and
// pins) can react to theme switches.
type ThemeFamily = "light" | "dark";

function resolve(): ThemeFamily {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return "dark";
  if (attr === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribe(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-palette"],
  });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", cb);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", cb);
  };
}

export function useThemeFamily(): ThemeFamily {
  return useSyncExternalStore(subscribe, resolve, () => "light");
}
