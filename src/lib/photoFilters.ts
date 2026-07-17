import type { Prisma } from "@prisma/client";

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

// Which part of the app a gallery photo came from, derived from its relations:
//  - checklist: attached as proof to a checklist item
//  - record:    tied to a work record
//  - project:   a plain jobsite-gallery upload (the default)
export type PhotoSource = "project" | "checklist" | "record";
export type PhotoSourceFilter = "all" | PhotoSource;

export function normalizePhotoSource(value: string | undefined): PhotoSourceFilter {
  return value === "project" || value === "checklist" || value === "record" ? value : "all";
}

// The where fragment that narrows to one source (empty for "all"). Checklist
// wins over record when a photo is both, matching derivePhotoSource below.
export function photoSourceWhere(source: PhotoSourceFilter): Prisma.PhotoWhereInput {
  if (source === "checklist") return { checklistItems: { some: {} } };
  if (source === "record") return { workRecordId: { not: null }, checklistItems: { none: {} } };
  if (source === "project") return { workRecordId: null, checklistItems: { none: {} } };
  return {};
}

// The source of a single photo, from the flags selected on it.
export function derivePhotoSource(p: {
  workRecordId: string | null;
  hasChecklist: boolean;
}): PhotoSource {
  if (p.hasChecklist) return "checklist";
  if (p.workRecordId) return "record";
  return "project";
}
