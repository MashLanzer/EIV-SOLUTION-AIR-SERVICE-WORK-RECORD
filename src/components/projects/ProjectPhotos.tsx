"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Camera, MapPin, MessageSquare, Tag as TagIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { deletePhotoAction } from "@/actions/photos";

export interface ProjectPhoto {
  id: string;
  url: string;
  takenAt: string;
  takenByName?: string | null;
  hasGps?: boolean;
  tagCount?: number;
  commentCount?: number;
}

// Compress a camera shot before upload: a 1600px JPEG (~250-400KB) is plenty
// for jobsite documentation and keeps storage/transfer small.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;

async function compressToBlob(file: File): Promise<Blob> {
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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
        "image/jpeg",
        JPEG_QUALITY
      )
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getGps(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    );
  });
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

export function ProjectPhotos({
  projectId,
  initialPhotos,
}: {
  projectId: string;
  initialPhotos: ProjectPhoto[];
}) {
  const [photos, setPhotos] = useState<ProjectPhoto[]>(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    // GPS once for the whole batch (they're taken at the same spot).
    const gps = await getGps();
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const blob = await compressToBlob(file);
        const fd = new FormData();
        fd.append("file", blob, "photo.jpg");
        if (gps) {
          fd.append("latitude", String(gps.lat));
          fd.append("longitude", String(gps.lng));
        }
        const res = await fetch(`/api/projects/${projectId}/photos`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "Upload failed");
        }
        const { photo } = (await res.json()) as { photo: ProjectPhoto };
        setPhotos((prev) => [{ ...photo, hasGps: Boolean(gps) }, ...prev]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload that photo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    startTransition(() => deletePhotoAction(id));
  }

  return (
    <div className="flex flex-col gap-3">
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
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Camera className="h-4 w-4" />
          {busy ? "Uploading..." : "Add photos"}
        </Button>
        {photos.length > 0 && (
          <span className="text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
            {photos.length} photo{photos.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Camera}
              title="No photos yet"
              description="Snap jobsite photos - they're time-stamped and geotagged automatically."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative">
              <Link href={`/admin/projects/${projectId}/photos/${photo.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Jobsite photo"
                  className="aspect-square w-full rounded-lg border border-neutral-200 dark:border-neutral-800 object-cover"
                />
              </Link>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 rounded-b-lg bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[10px] text-white">
                <span className="tabular-nums">{timeAgo(photo.takenAt)}</span>
                <span className="flex items-center gap-1.5">
                  {photo.tagCount ? (
                    <span className="flex items-center gap-0.5">
                      <TagIcon className="h-3 w-3" />
                      {photo.tagCount}
                    </span>
                  ) : null}
                  {photo.commentCount ? (
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="h-3 w-3" />
                      {photo.commentCount}
                    </span>
                  ) : null}
                  {photo.hasGps && <MapPin className="h-3 w-3" />}
                </span>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                aria-label="Delete photo"
                onClick={() => remove(photo.id)}
                className="absolute -right-2 -top-2 h-7 w-7 rounded-full opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
