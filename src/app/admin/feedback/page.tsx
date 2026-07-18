import Link from "next/link";
import { MessageSquareHeart, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackList } from "@/components/feedback/FeedbackList";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { getFeedbackOverview } from "@/lib/feedback";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ rating?: string; needs?: string }>;
}) {
  const session = await requirePermission("records.review");
  const organizationId = requireOrgId(session);
  const { rating: ratingParam, needs } = await searchParams;

  const rating =
    ratingParam && /^[1-5]$/.test(ratingParam) ? Number(ratingParam) : undefined;
  const needsResponse = needs === "1";

  const { summary, byWorker, items } = await getFeedbackOverview(organizationId, {
    rating,
    needsResponse,
  });
  const t = (await getT()).feedback;
  const locale = await getLocale();

  const reviewsLabel = (n: number) =>
    (n === 1 ? t.reviewsOne : t.reviewsMany).replace("{n}", String(n));

  const maxBar = Math.max(1, ...Object.values(summary.distribution));

  // Filter chips are URL-driven so the page stays a server component.
  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={label}
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-100"
      )}
    >
      {label}
    </Link>
  );

  const noFilter = !rating && !needsResponse;

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="overview" />
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <MessageSquareHeart className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t.title}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.description}</p>
        </div>
      </div>

      {summary.count === 0 ? (
        <EmptyState icon={MessageSquareHeart} title={t.noneYet} description={t.noneYetDesc} />
      ) : (
        <>
          {/* Overall rating + distribution */}
          <Card className="animate-fade-up">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center gap-1 sm:w-40">
                <div className="text-4xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {summary.average.toFixed(1)}
                </div>
                <span className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        "h-4 w-4",
                        n <= Math.round(summary.average)
                          ? "fill-amber-400 text-amber-400"
                          : "text-neutral-300 dark:text-neutral-600"
                      )}
                    />
                  ))}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {reviewsLabel(summary.count)}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = summary.distribution[star as 1 | 2 | 3 | 4 | 5];
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
            </CardContent>
          </Card>

          {/* Average rating per worker */}
          {byWorker.length > 0 && (
            <section className="flex flex-col gap-2">
              <div className="px-1">
                <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {t.byWorkerTitle}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.byWorkerDesc}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-950">
                {byWorker.map((w) => (
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
            {chip(t.filterAll, "/admin/feedback", noFilter)}
            {[5, 4, 3, 2, 1].map((star) =>
              chip(
                `${star}★`,
                `/admin/feedback?rating=${star}`,
                rating === star && !needsResponse
              )
            )}
            {chip(
              `${t.filterNeedsReply} (${summary.needsResponse})`,
              "/admin/feedback?needs=1",
              needsResponse
            )}
          </div>

          {items.length === 0 ? (
            <EmptyState icon={Star} title={t.noMatches} />
          ) : (
            <FeedbackList items={items} locale={locale} />
          )}
        </>
      )}
      </div>
    </div>
  );
}
