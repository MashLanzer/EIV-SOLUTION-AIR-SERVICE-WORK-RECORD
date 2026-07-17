"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface RecordPhoto {
  id: string;
  dataUrl: string;
  position: number;
}

// Thumbnail grid where tapping a photo opens a full-screen viewer with
// prev/next. A base64 data: URL doesn't reliably open in a new tab inside the
// Android WebView, so we show it in an in-app overlay instead.
export function RecordPhotoGrid({ photos }: { photos: RecordPhoto[] }) {
  const t = useT().photos;
  const tc = useT().common;
  const [open, setOpen] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);

  const close = useCallback(() => {
    setOpen(null);
    setZoom(false);
  }, []);
  const go = useCallback(
    (dir: number) => {
      setZoom(false);
      setOpen((i) => {
        if (i == null) return i;
        return (i + dir + photos.length) % photos.length;
      });
    },
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

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
            aria-label={t.openPhoto.replace("{n}", String(photo.position + 1))}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.dataUrl}
              alt={t.workPhoto.replace("{n}", String(photo.position + 1))}
              className="h-full w-full object-cover transition-transform group-active:scale-95"
            />
          </button>
        ))}
      </div>

      {open != null && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex bg-black/90 p-4",
            zoom ? "items-start justify-start overflow-auto" : "items-center justify-center"
          )}
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={close}
            aria-label={tc.close}
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {photos.length > 1 && !zoom && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                aria-label={t.previousPhoto}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(1); }}
                aria-label={t.nextPhoto}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[open].dataUrl}
            alt={t.workPhoto.replace("{n}", String(photos[open].position + 1))}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => { e.stopPropagation(); setZoom((z) => !z); }}
            className={cn(
              "select-none rounded-lg transition-transform",
              zoom
                ? "m-auto w-[170%] max-w-none cursor-zoom-out"
                : "max-h-full max-w-full object-contain cursor-zoom-in"
            )}
          />
          <span className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm tabular-nums text-white">
            {open + 1} / {photos.length}
          </span>
        </div>
      )}
    </>
  );
}
