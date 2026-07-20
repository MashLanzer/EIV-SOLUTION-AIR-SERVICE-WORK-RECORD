"use client";

import { useCallback, useRef, useState } from "react";
import { MessageSquareHeart, Star } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackList } from "@/components/feedback/FeedbackList";
import { getOpinionsAction } from "@/actions/opinions";
import type { FeedbackOverview } from "@/lib/feedback";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type Filter = { rating?: number; needsResponse?: boolean };

// The header entry point to customer opinions. The whole feedback experience
// now lives inside this sheet — overall rating, distribution, per-worker
// averages, filters and the reviews list (with inline replies). Data loads on
// first open and re-fetches when a filter changes.
export function HeaderOpinionsButton() {
  const dict = useT();
  const locale = useLocale();
  const t = dict.feedback;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FeedbackOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>({});
  // Guards against a stale response overwriting a newer filter's result.
  const seqRef = useRef(0);

  const load = useCallback((f: Filter) => {
    const seq = ++seqRef.current;
    setLoading(true);
    void getOpinionsAction(f)
      .then((res) => {
        if (seq === seqRef.current) setData(res);
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, []);

  function openSheet() {
    setOpen(true);
    if (!data && !loading) load(filter);
  }

  function applyFilter(next: Filter) {
    setFilter(next);
    load(next);
  }

  const reviewsLabel = (n: number) =>
    (n === 1 ? t.reviewsOne : t.reviewsMany).replace("{n}", String(n));
  const summary = data?.summary;
  const maxBar = summary ? Math.max(1, ...Object.values(summary.distribution)) : 1;
  const noFilter = !filter.rating && !filter.needsResponse;

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label={dict.opinions.title}
        title={dict.opinions.title}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-95"
      >
        <MessageSquareHeart className="h-4 w-4" />
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={dict.opinions.title}
        closeLabel={dict.common.close}
      >
        {!data ? (
          <p className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {dict.opinions.loading}
          </p>
        ) : summary && summary.count === 0 ? (
          <EmptyState icon={MessageSquareHeart} title={t.noneYet} description={t.noneYetDesc} />
        ) : (
          <div className={cn("flex flex-col gap-4", loading && "opacity-60 transition-opacity")}>
            {/* Overall rating + distribution */}
            <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center gap-1 sm:w-36">
                <div className="text-4xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {summary!.average.toFixed(1)}
                </div>
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        "h-4 w-4",
                        n <= Math.round(summary!.average)
                          ? "fill-amber-400 text-amber-400"
                          : "text-neutral-300 dark:text-neutral-600"
                      )}
                    />
                  ))}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {reviewsLabel(summary!.count)}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = summary!.distribution[star as 1 | 2 | 3 | 4 | 5];
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="flex w-8 shrink-0 items-center gap-0.5 tabular-nums text-neutral-500 dark:text-neutral-400">
                        {star}
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <span
                          className="block h-full rounded-full bg-amber-400"
                          style={{ width: `${(n / maxBar) * 100}%` }}
                        />
                      </span>
                      <span className="w-6 shrink-0 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                        {n}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Average rating per worker */}
            {data.byWorker.length > 0 && (
              <section className="flex flex-col gap-2">
                <div className="px-1">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {t.byWorkerTitle}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.byWorkerDesc}</p>
                </div>
                <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950">
                  {data.byWorker.map((w) => (
                    <div key={w.name} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {w.name}
                      </span>
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              "h-3.5 w-3.5",
                              n <= Math.round(w.average)
                                ? "fill-amber-400 text-amber-400"
                                : "text-neutral-300 dark:text-neutral-600"
                            )}
                          />
                        ))}
                      </span>
                      <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                        {w.average.toFixed(1)}
                      </span>
                      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                        {w.count}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Filters */}
            <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
              <FilterChip label={t.filterAll} active={noFilter} onClick={() => applyFilter({})} />
              {[5, 4, 3, 2, 1].map((star) => (
                <FilterChip
                  key={star}
                  label={`${star}★`}
                  active={filter.rating === star && !filter.needsResponse}
                  onClick={() => applyFilter({ rating: star })}
                />
              ))}
              <FilterChip
                label={`${t.filterNeedsReply} (${summary!.needsResponse})`}
                active={Boolean(filter.needsResponse)}
                onClick={() => applyFilter({ needsResponse: true })}
              />
            </div>

            {data.items.length === 0 ? (
              <EmptyState icon={Star} title={t.noMatches} />
            ) : (
              <FeedbackList items={data.items} locale={locale} />
            )}
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-100"
      )}
    >
      {label}
    </button>
  );
}
