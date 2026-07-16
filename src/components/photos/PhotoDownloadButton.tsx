"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { PHOTO_OVERLAY_ICON } from "@/components/photos/PhotoViewer";
import { useT } from "@/components/i18n/LocaleProvider";

// Save the original photo to the device. Fetches the blob and triggers a
// download; if that's blocked (e.g. cross-origin CORS in some WebViews) it
// falls back to opening the image so the user can long-press to save.
// Rendered as a glassy icon button on the photo overlay toolbar.
export function PhotoDownloadButton({ url }: { url: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      aria-label={busy ? t.common.saving : t.photoDetail.download}
      className={`${PHOTO_OVERLAY_ICON} disabled:opacity-60`}
    >
      <Download className="h-5 w-5" />
    </button>
  );
}
