"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  MessageSquare,
  Tag as TagIcon,
  User,
  X,
} from "lucide-react";

export interface FeedPhoto {
  id: string;
  url: string;
  takenAt: string; // ISO
  projectId: string;
  projectName: string;
  takenByName?: string | null;
  hasGps: boolean;
  tagCount: number;
  commentCount: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(d);
}

// Small counts row reused on the thumbnail overlay and the viewer meta bar.
function MetaCounts({ photo, light }: { photo: FeedPhoto; light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 ${light ? "text-white/90" : ""}`}>
      {photo.tagCount > 0 && (
        <span className="flex items-center gap-0.5">
          <TagIcon className="h-3 w-3" />
          {photo.tagCount}
        </span>
      )}
      {photo.commentCount > 0 && (
        <span className="flex items-center gap-0.5">
          <MessageSquare className="h-3 w-3" />
          {photo.commentCount}
        </span>
      )}
      {photo.hasGps && <MapPin className="h-3 w-3" />}
    </span>
  );
}

// Company/team photo feed: photos grouped by day, tapping one opens a
// full-screen viewer (prev/next across the whole list) with a link out to the
// photo's detail page for comments/tags. `basePath` picks the admin vs worker
// project route.
export function PhotoFeed({
  photos,
  basePath,
}: {
  photos: FeedPhoto[];
  basePath: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const groups = useMemo(() => {
    const map = new Map<number, { label: string; items: FeedPhoto[] }>();
    for (const p of photos) {
      const key = startOfDay(new Date(p.takenAt));
      if (!map.has(key)) map.set(key, { label: dayLabel(p.takenAt), items: [] });
      map.get(key)!.items.push(p);
    }
    // photos arrive newest-first, so insertion order is already correct
    return Array.from(map.values());
  }, [photos]);

  const close = useCallback(() => setOpen(null), []);
  const go = useCallback(
    (dir: number) =>
      setOpen((i) => (i == null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (open == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, go]);

  // Flat index so the viewer can page across day groups seamlessly.
  const flat = photos;
  const active = open != null ? flat[open] : null;

  return (
    <>
      <div className="flex flex-col gap-5">
        {groups.map((group) => {
          const startIndex = flat.indexOf(group.items[0]);
          return (
            <section key={group.label + startIndex} className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {group.label}
                <span className="ml-1.5 font-normal tabular-nums text-neutral-400 dark:text-neutral-500">
                  {group.items.length}
                </span>
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {group.items.map((photo) => {
                  const index = flat.indexOf(photo);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setOpen(index)}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
                      aria-label={`Open photo from ${photo.projectName}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt=""
                        className="h-full w-full object-cover transition-transform group-active:scale-95"
                      />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[10px] text-white">
                        <span className="truncate">{photo.projectName}</span>
                        <MetaCounts photo={photo} light />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {active && open != null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
        >
          {/* Top bar: project + close */}
          <div className="flex items-center justify-between gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 text-white">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{active.projectName}</div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                {active.takenByName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {active.takenByName}
                  </span>
                )}
                <span>{timeAgo(active.takenAt)}</span>
                <MetaCounts photo={active} light />
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2">
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous"
                  className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next"
                  className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>

          {/* Bottom bar: counter + details link */}
          <div className="flex items-center justify-between gap-2 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm tabular-nums text-white">
              {open + 1} / {photos.length}
            </span>
            <Link
              href={`${basePath}/${active.projectId}/photos/${active.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
            >
              <ExternalLink className="h-4 w-4" />
              View details
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
