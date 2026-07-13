"use client";

import { useState, useTransition } from "react";
import { MapPinOff, RefreshCw } from "lucide-react";

import { retryGeocodeAction } from "@/actions/projects";
import { useT } from "@/components/i18n/LocaleProvider";

// Shown on a project whose address is set but didn't resolve to coordinates, so
// the missing map pin has a visible reason instead of just vanishing. Admins
// get a one-tap Retry (re-runs geocoding); workers see the passive notice only.
export function GeocodeNotice({
  projectId,
  address,
  canRetry,
}: {
  projectId: string;
  address: string;
  canRetry: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [stillMissing, setStillMissing] = useState(false);
  const t = useT().projects;

  function retry() {
    setStillMissing(false);
    startTransition(async () => {
      const res = await retryGeocodeAction(projectId);
      // On success the page revalidates and this notice is replaced by the map;
      // if it still didn't match, tell them so they can check the address.
      if (res.ok && !res.located) setStillMissing(true);
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
        <MapPinOff className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {t.geocodeTitle}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{address}</p>
        {stillMissing && (
          <p className="mt-1 text-xs text-warning-text">
            {t.geocodeStillMissing}
          </p>
        )}
      </div>
      {canRetry && (
        <button
          type="button"
          onClick={retry}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-1.5 text-xs font-medium text-neutral-900 dark:text-neutral-100 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
          {pending ? t.retrying : t.retry}
        </button>
      )}
    </div>
  );
}
