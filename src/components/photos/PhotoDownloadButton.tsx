"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

// Save the original photo to the device. Fetches the blob and triggers a
// download; if that's blocked (e.g. cross-origin CORS in some WebViews) it
// falls back to opening the image so the user can long-press to save.
export function PhotoDownloadButton({ url }: { url: string }) {
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
    <Button type="button" variant="outline" size="sm" onClick={handle} disabled={busy}>
      <Download className="h-4 w-4" />
      {busy ? "Saving..." : "Download"}
    </Button>
  );
}
