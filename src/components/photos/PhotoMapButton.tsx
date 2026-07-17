"use client";

import { MapPin } from "lucide-react";

import { GeoPhotoMap } from "@/components/projects/GeoPhotoMap";
import { SheetButton } from "@/components/schedule/SheetButton";
import type { MapPin as Pin } from "@/components/projects/ProjectsMap";
import { useT } from "@/components/i18n/LocaleProvider";

// The photo feed's map, tucked behind a "Map" button that opens a bottom sheet.
// The map (Leaflet) only mounts when the sheet opens, so the feed leads with
// the photos and pays no map cost until asked. Renders nothing with no located
// photos.
export function PhotoMapButton({ photoPins }: { photoPins: Pin[] }) {
  const t = useT().photos;
  if (photoPins.length === 0) return null;
  return (
    <SheetButton
      label={`${t.map} · ${photoPins.length}`}
      icon={<MapPin className="h-4 w-4" />}
      title={t.map}
    >
      <GeoPhotoMap projectPins={[]} photoPins={photoPins} />
    </SheetButton>
  );
}
