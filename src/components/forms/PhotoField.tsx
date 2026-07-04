"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      const selected = Array.from(files).slice(0, room);
      const compressed: string[] = [];
      for (const file of selected) {
        if (!file.type.startsWith("image/")) continue;
        compressed.push(await compressToDataUrl(file));
      }
      if (compressed.length > 0) {
        setPhotos((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS));
      }
    } catch {
      setError("Could not process that photo. Try a different one.");
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
                alt={`Work photo ${i + 1}`}
                className="aspect-square w-full rounded-md border border-slate-200 object-cover"
              />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() =>
                  setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
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
          {busy ? "Processing..." : "Add Photo"}
        </Button>
        <span className="text-sm text-slate-500">
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
