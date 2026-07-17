import type { PhotoRange } from "@/components/photos/PhotoFilters";

// The photo feed's date-range filter. Kept tiny and shared so the admin and
// worker pages (and the export route) narrow by the same windows.

// Coerce an untrusted ?range= value to a known range; anything else is "all".
export function normalizePhotoRange(value: string | undefined): PhotoRange {
  return value === "today" || value === "7d" || value === "30d" ? value : "all";
}

// The lower bound (inclusive) for a range, or null for "all". "today" is the
// start of the local calendar day; the rolling windows count back from now.
export function photoRangeCutoff(range: PhotoRange): Date | null {
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "7d") return new Date(Date.now() - 7 * 86_400_000);
  if (range === "30d") return new Date(Date.now() - 30 * 86_400_000);
  return null;
}
