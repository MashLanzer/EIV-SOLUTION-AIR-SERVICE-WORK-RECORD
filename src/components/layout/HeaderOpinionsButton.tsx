"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, MessageSquareHeart, Star } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { StarRating } from "@/components/ui/star-rating";
import { EmptyState } from "@/components/ui/empty-state";
import { getOpinionsAction, type OpinionsSnapshot } from "@/actions/opinions";
import { useT } from "@/components/i18n/LocaleProvider";

// A header quick-view of customer opinions: a small icon button that opens a
// sheet with the overall rating and the latest comments. Data loads on first
// open so it costs nothing until used.
export function HeaderOpinionsButton() {
  const dict = useT();
  const t = dict.opinions;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<OpinionsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle() {
    setOpen(true);
    if (!data && !loading) {
      setLoading(true);
      void getOpinionsAction()
        .then(setData)
        .finally(() => setLoading(false));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={t.title}
        title={t.title}
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 active:scale-95 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      >
        <MessageSquareHeart className="h-5 w-5" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.title} closeLabel={dict.common.close}>
        <div className="flex flex-col gap-4">
          {loading && !data ? (
            <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">{t.loading}</p>
          ) : !data || data.count === 0 ? (
            <EmptyState icon={MessageSquareHeart} title={t.emptyTitle} description={t.emptyDesc} />
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                <span className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {data.average.toFixed(1)}
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {(data.count === 1 ? t.countOne : t.countMany).replace("{n}", String(data.count))}
                </span>
              </div>

              <ul className="flex flex-col gap-2.5">
                {data.items.map((it) => (
                  <li
                    key={it.recordId}
                    className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StarRating rating={it.rating} />
                      <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {it.customerName}
                      </span>
                    </div>
                    {it.feedback && (
                      <p className="text-sm text-neutral-700 dark:text-neutral-200">“{it.feedback}”</p>
                    )}
                    {it.response && (
                      <p className="flex items-start gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {it.response}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              <Link
                href="/admin/feedback"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 self-center text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                {t.viewAll}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </BottomSheet>
    </>
  );
}
