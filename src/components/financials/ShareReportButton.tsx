"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { enableReportShareAction, disableReportShareAction } from "@/actions/reportShare";
import { useT } from "@/components/i18n/LocaleProvider";

export function ShareReportButton({
  initialToken,
  className,
}: {
  initialToken: string | null;
  className?: string;
}) {
  const t = useT().reportShare;
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(initialToken);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : "";

  function enable() {
    startTransition(async () => {
      const res = await enableReportShareAction();
      if (res) setToken(res.token);
    });
  }
  function disable() {
    startTransition(async () => {
      await disableReportShareAction();
      setToken(null);
      setCopied(false);
    });
  }
  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the input is selectable as a fallback */
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className={className} onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">{t.share}</span>
      </Button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.title} closeLabel={useT().common.close}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.desc}</p>

          {token ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                <Link2 className="h-4 w-4 shrink-0 text-neutral-400" />
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 bg-transparent text-sm text-neutral-700 outline-none dark:text-neutral-200"
                  aria-label={t.linkLabel}
                />
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? t.copied : t.copy}
                </button>
              </div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">{t.liveNote}</p>
              <Button type="button" variant="outline" onClick={disable} disabled={pending}>
                {t.stopSharing}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={enable} disabled={pending}>
              <Link2 className="h-4 w-4" />
              {pending ? t.creating : t.createLink}
            </Button>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
