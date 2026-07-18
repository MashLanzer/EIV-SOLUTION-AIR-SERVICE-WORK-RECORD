"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, PencilLine } from "lucide-react";

import { Card } from "@/components/ui/card";
import { useT } from "@/components/i18n/LocaleProvider";
import { draftHasContent, getDraft } from "@/lib/draftStore";

// A gentle "pick up where you left off" prompt on the worker's home. Reads the
// autosaved new-record draft (IndexedDB, client-only) and only shows once we
// know it holds real content, so a fresh visitor never sees it. Tapping it goes
// to /records/new, where the form itself offers to restore the draft.
export function ResumeDraftCard({ draftKey }: { draftKey: string }) {
  const t = useT().records;
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDraft<Record<string, unknown>>(draftKey).then((d) => {
      if (!cancelled && draftHasContent(d)) setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  if (!show) return null;

  return (
    <Link href="/records/new" className="block animate-fade-up">
      <Card className="flex items-center gap-3 p-3 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
          <PencilLine className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.resumeDraftTitle}
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {t.resumeDraftDesc}
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {t.resume}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
      </Card>
    </Link>
  );
}
