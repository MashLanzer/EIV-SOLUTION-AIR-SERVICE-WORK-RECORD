"use client";

import dynamic from "next/dynamic";

import type { MapPin } from "@/components/projects/ProjectsMap";

// Leaflet touches `window` at import time, so the map only loads on the
// client (never server-rendered). A pulsing placeholder holds the space
// while the chunk loads.
const ProjectsMap = dynamic(() => import("@/components/projects/ProjectsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-neutral-100 dark:bg-neutral-800" />
  ),
});

export function ProjectsMapCard({ pins }: { pins: MapPin[] }) {
  return (
    // `isolate` gives the map its own stacking context so Leaflet's controls
    // and attribution (z-index ~1000 by default) stay contained and can't
    // paint over the app's overlays - the bottom sheet / menu (z-40) would
    // otherwise show the map bleeding through on top of it.
    <div className="isolate h-64 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 sm:h-80">
      <ProjectsMap pins={pins} />
    </div>
  );
}
