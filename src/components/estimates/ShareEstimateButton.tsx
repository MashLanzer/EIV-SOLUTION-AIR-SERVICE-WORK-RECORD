"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shareEstimateAction, unshareEstimateAction } from "@/actions/estimates";
import { useT } from "@/components/i18n/LocaleProvider";

export function ShareEstimateButton({
  estimateId,
  initialToken,
}: {
  estimateId: string;
  initialToken: string | null;
}) {
  const t = useT().estimates;
  const [token, setToken] = useState<string | null>(initialToken);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const url =
    token && typeof window !== "undefined" ? `${window.location.origin}/estimate/${token}` : "";

  function share() {
    startTransition(async () => {
      const res = await shareEstimateAction(estimateId);
      if (res?.token) setToken(res.token);
    });
  }
  function stop() {
    startTransition(async () => {
      await unshareEstimateAction(estimateId);
      setToken(null);
    });
  }
  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!token) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={share} disabled={pending}>
        <Share2 className="h-4 w-4" />
        {t.shareLink}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
        <Input readOnly value={url} className="h-9 flex-1 text-xs" aria-label={t.copyLink} />
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t.copied : t.copyLink}
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{t.shareHint}</span>
        <Button type="button" variant="ghost" size="sm" onClick={stop} disabled={pending}>
          {t.stopSharing}
        </Button>
      </div>
    </div>
  );
}
