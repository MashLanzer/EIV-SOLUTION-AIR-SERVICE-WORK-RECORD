"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MessageCircle, X } from "lucide-react";

// The jobsite photo as a hero: the who/when/location and actions sit over the
// image on a transparent gradient scrim, and comments open in a bottom sheet.
// All data-bearing content (meta, actions, comments) is rendered by the server
// and passed in as slots, so server actions and i18n keep working unchanged.
export function PhotoViewer({
  src,
  alt,
  overlayTop,
  overlayBottom,
  commentsCount,
  commentsTitle,
  comments,
  closeLabel,
}: {
  src: string;
  alt: string;
  overlayTop: ReactNode;
  overlayBottom: ReactNode;
  commentsCount: number;
  commentsTitle: string;
  comments: ReactNode;
  closeLabel: string;
}) {
  const [zoom, setZoom] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    if (!zoom && !sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoom(false);
        setSheet(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoom, sheet]);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 dark:border-neutral-800">
        {/* Tap the image to zoom; overlays sit above via pointer-events. */}
        <button type="button" onClick={() => setZoom(true)} className="block w-full" aria-label={alt}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[70vh] w-full object-contain" />
        </button>

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          <div className="bg-gradient-to-b from-black/70 via-black/25 to-transparent p-3 pb-6">
            <div className="pointer-events-auto text-white [&_*]:!text-white/90">{overlayTop}</div>
          </div>
          <div className="bg-gradient-to-t from-black/75 via-black/30 to-transparent p-3 pt-8">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              {overlayBottom}
              <button
                type="button"
                onClick={() => setSheet(true)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/25"
              >
                <MessageCircle className="h-4 w-4" />
                {commentsTitle}
                <span className="tabular-nums text-white/70">{commentsCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen zoom */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setZoom(false)}
            aria-label={closeLabel}
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      {/* Comments bottom sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={commentsTitle}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheet(false)} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] animate-fade-up flex-col rounded-t-2xl border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 native:pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {commentsTitle} <span className="tabular-nums text-neutral-400">({commentsCount})</span>
              </h2>
              <button
                type="button"
                onClick={() => setSheet(false)}
                aria-label={closeLabel}
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{comments}</div>
          </div>
        </div>
      )}
    </>
  );
}
