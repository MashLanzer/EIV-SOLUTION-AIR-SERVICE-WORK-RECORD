import type { ReviewAction } from "@prisma/client";
import { CheckCircle2, RotateCcw, Send, RefreshCw } from "lucide-react";

import { getLocale, getT } from "@/lib/i18n/server";

export interface ReviewTimelineEvent {
  id: string;
  action: ReviewAction;
  note: string | null;
  actorName: string;
  createdAt: Date;
}

const ICONS: Record<ReviewAction, typeof Send> = {
  SUBMITTED: Send,
  RESUBMITTED: RefreshCw,
  APPROVED: CheckCircle2,
  RETURNED: RotateCcw,
};

// The review history of a work record, newest first: a vertical timeline of who
// submitted / approved / returned it and when, with the return note inline.
// Async server component - reads the dictionary/locale itself so both the admin
// and worker record pages can drop it in with just the events.
export async function ReviewTimeline({ events }: { events: ReviewTimelineEvent[] }) {
  if (events.length === 0) return null;

  const dict = await getT();
  const t = dict.adminRecords;
  const locale = await getLocale();
  const fmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const label: Record<ReviewAction, string> = {
    SUBMITTED: t.actionSubmitted,
    RESUBMITTED: t.actionResubmitted,
    APPROVED: t.actionApproved,
    RETURNED: t.actionReturned,
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {t.reviewHistory}
      </h2>
      <ol className="flex flex-col gap-4">
        {events.map((e, i) => {
          const Icon = ICONS[e.action];
          const isReturn = e.action === "RETURNED";
          return (
            <li key={e.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
                    (e.action === "APPROVED"
                      ? "bg-success-soft text-success-text"
                      : isReturn
                        ? "bg-warning-soft text-warning-text"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400")
                  }
                >
                  <Icon className="h-4 w-4" />
                </span>
                {i < events.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {label[e.action]}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t.reviewBy.replace("{name}", e.actorName)}
                  </span>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    · {fmt.format(e.createdAt)}
                  </span>
                </div>
                {e.note && (
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-2 text-sm text-neutral-700 dark:text-neutral-300">
                    {e.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
