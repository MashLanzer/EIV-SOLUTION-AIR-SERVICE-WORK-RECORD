"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { shareRecordAction, unshareRecordAction } from "@/actions/records";
import { useT } from "@/components/i18n/LocaleProvider";

// Toggle the public customer receipt from the record detail. When shared, shows
// the link with copy / open / stop-sharing controls.
export function ShareReceiptButton({
  recordId,
  initialToken,
}: {
  recordId: string;
  initialToken: string | null;
}) {
  const t = useT().receipt;
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const url = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/receipt/${token}` : "";

  function share() {
    startTransition(async () => {
      const res = await shareRecordAction(recordId);
      if (res?.token) setToken(res.token);
    });
  }
  function stop() {
    startTransition(async () => {
      await unshareRecordAction(recordId);
      setToken(null);
      setCopied(false);
    });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked - the link is still selectable in the field */
    }
  }

  if (!token) {
    return (
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={share}>
        <Share2 className="h-4 w-4" />
        {t.share}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-3">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300"
          aria-label={t.shareTitle}
        />
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t.copied : t.copyLink}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            {t.openLink}
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={stop}
          className="text-destructive-text"
        >
          <X className="h-3.5 w-3.5" />
          {t.stopSharing}
        </Button>
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.sharingHint}</p>
    </div>
  );
}
