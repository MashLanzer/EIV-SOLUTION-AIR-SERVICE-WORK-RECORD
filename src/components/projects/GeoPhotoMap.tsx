"use client";

import { useState } from "react";

import { ProjectsMapCard } from "@/components/projects/ProjectsMapCard";
import type { MapPin } from "@/components/projects/ProjectsMap";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Filter = "all" | "project" | "photos";

// Wraps the reused map with a filter so one map can show a project's location,
// its photo GPS points, or both. The segmented control only appears when there
// are both kinds to switch between; with a single kind it's just the map.
//
// `showAllOption` gates the "All" tab: it makes sense on the projects-list map
// (all projects together) but not inside a single project, where "All" would
// just be "this project + its photos" — so the detail map drops it and defaults
// to the photos.
export function GeoPhotoMap({
  projectPins,
  photoPins,
  showAllOption = true,
}: {
  projectPins: MapPin[];
  photoPins: MapPin[];
  showAllOption?: boolean;
}) {
  const t = useT().photos;
  const both = projectPins.length > 0 && photoPins.length > 0;
  const [filter, setFilter] = useState<Filter>(
    showAllOption ? "all" : photoPins.length > 0 ? "photos" : "project"
  );

  if (projectPins.length === 0 && photoPins.length === 0) return null;

  const pins =
    !both || filter === "all"
      ? [...projectPins, ...photoPins]
      : filter === "project"
        ? projectPins
        : photoPins;

  const options: { value: Filter; label: string }[] = [
    ...(showAllOption ? [{ value: "all" as Filter, label: t.mapAll }] : []),
    { value: "project", label: t.mapProject },
    { value: "photos", label: t.mapPhotos.replace("{n}", String(photoPins.length)) },
  ];

  return (
    <div className="flex flex-col gap-2">
      {both && (
        <div
          role="radiogroup"
          aria-label={t.mapFilter}
          className={cn(
            "grid gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1",
            options.length === 2 ? "grid-cols-2" : "grid-cols-3"
          )}
        >
          {options.map((opt) => {
            const active = filter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
      <ProjectsMapCard pins={pins} />
    </div>
  );
}
