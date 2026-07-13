"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/LocaleProvider";
import { MAX_PHOTOS } from "@/lib/validations";

// Compress on-device before upload: phone camera shots are 3-10MB, but a
// 1280px JPEG (~200-300KB) is plenty for job documentation and keeps the
// database small.
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.72;

async function compressToDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image"));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image");
    // White backdrop so transparent PNGs don't turn black as JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function PhotoField({ defaultPhotos }: { defaultPhotos?: string[] }) {
  const t = useT().form;
  const [photos, setPhotos] = useState<string[]>(defaultPhotos ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const room = MAX_PHOTOS - photos.length;
      const all = Array.from(files);
      const selected = all.slice(0, room);
      const overflow = all.length - selected.length;

      const compressed: string[] = [];
      let skippedNonImage = 0;
      for (const file of selected) {
        if (!file.type.startsWith("image/")) {
          skippedNonImage += 1;
          continue;
        }
        compressed.push(await compressToDataUrl(file));
      }
      if (compressed.length > 0) {
        setPhotos((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS));
      }

      // Let the worker know why they have fewer photos than they picked,
      // instead of silently dropping files that didn't fit or weren't images.
      const notices: string[] = [];
      if (overflow > 0) {
        notices.push(
          (overflow === 1 ? t.overflowNoticeOne : t.overflowNoticeMany)
            .replace("{max}", String(MAX_PHOTOS))
            .replace("{n}", String(overflow))
        );
      }
      if (skippedNonImage > 0) {
        notices.push(
          (skippedNonImage === 1 ? t.nonImageNoticeOne : t.nonImageNoticeMany).replace(
            "{n}",
            String(skippedNonImage)
          )
        );
      }
      if (notices.length > 0) setError(notices.join(" "));
    } catch {
      setError(t.photoProcessError);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      {photos.map((photo, i) => (
        <input key={i} type="hidden" name="photos" value={photo} />
      ))}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={t.workPhotoAlt.replace("{n}", String(i + 1))}
                className="aspect-square w-full rounded-lg border border-neutral-200 dark:border-neutral-800 object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label={t.removePhotoAria.replace("{n}", String(i + 1))}
                onClick={() =>
                  setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="absolute -right-3 -top-3 rounded-full shadow"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy || photos.length >= MAX_PHOTOS}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          {busy ? t.processing : t.addPhoto}
        </Button>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {photos.length}/{MAX_PHOTOS}
        </span>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
