"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Camera, Check, Trash2, X } from "lucide-react";

import {
  deleteChecklistItemAction,
  setChecklistItemPhotoAction,
  toggleChecklistItemAction,
} from "@/actions/checklists";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface ChecklistItemRowData {
  id: string;
  text: string;
  done: boolean;
  photo: { id: string; url: string } | null;
}

// Compress a camera shot before upload — a 1600px JPEG is plenty for proof and
// keeps storage/transfer small (same budget as the project photo uploader).
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;

async function compressToBlob(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("read"));
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ctx");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("encode"))),
        "image/jpeg",
        JPEG_QUALITY
      )
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// One checklist item: the done toggle, the label, an optional proof photo
// (capture → upload → attach, which also completes the item), and — for admins —
// a delete control. Interactive, so it lives in the client.
export function ChecklistItemRow({
  item,
  projectId,
  basePath,
  canManage,
}: {
  item: ChecklistItemRowData;
  projectId: string;
  // Route prefix for the photo detail link (admin vs worker area).
  basePath: string;
  canManage: boolean;
}) {
  const t = useT().projects;
  const [done, setDone] = useState(item.done);
  const [photo, setPhoto] = useState(item.photo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle() {
    setDone((d) => !d);
    startTransition(() => toggleChecklistItemAction(item.id));
  }

  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setError(false);
    setBusy(true);
    try {
      const blob = await compressToBlob(file);
      const fd = new FormData();
      fd.append("file", blob, "proof.jpg");
      const res = await fetch(`/api/projects/${projectId}/photos`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("upload");
      const { photo: uploaded } = (await res.json()) as {
        photo: { id: string; url: string };
      };
      setPhoto(uploaded);
      setDone(true); // Attaching evidence completes the item.
      startTransition(() => setChecklistItemPhotoAction(item.id, uploaded.id));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePhoto() {
    setPhoto(null);
    startTransition(() => setChecklistItemPhotoAction(item.id, null));
  }

  return (
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-neutral-100 dark:border-neutral-800 py-2 last:border-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={(done ? t.markNotDone : t.markDone).replace("{text}", item.text)}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-neutral-300 dark:border-neutral-600 hover:border-primary"
        )}
      >
        {done && <Check className="h-3.5 w-3.5" />}
      </button>

      <span
        className={cn(
          "flex-1 text-sm",
          done ? "text-neutral-400 line-through" : "text-neutral-900 dark:text-neutral-100"
        )}
      >
        {item.text}
      </span>

      {/* Proof photo: a thumbnail when attached, else a capture button. */}
      {photo ? (
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`${basePath}/${projectId}/photos/${photo.id}`}
            aria-label={t.proofView}
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              className="h-8 w-8 rounded-md border border-neutral-200 object-cover dark:border-neutral-700"
            />
          </Link>
          <button
            type="button"
            onClick={removePhoto}
            aria-label={t.proofRemove}
            className="text-neutral-300 dark:text-neutral-600 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Camera className="h-3.5 w-3.5" />
          {busy ? t.proofUploading : t.proofAdd}
        </button>
      )}

      {error && (
        <span className="basis-full text-xs text-destructive" role="alert">
          {t.proofFailed}
        </span>
      )}

      {canManage && (
        <button
          type="button"
          onClick={() => startTransition(() => deleteChecklistItemAction(item.id))}
          aria-label={t.deleteItemAria.replace("{text}", item.text)}
          className="shrink-0 text-neutral-300 dark:text-neutral-600 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}
