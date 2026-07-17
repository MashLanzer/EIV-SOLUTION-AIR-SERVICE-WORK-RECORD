"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { respondToFeedbackAction, type FeedbackResponseState } from "@/actions/feedback";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { FeedbackItem } from "@/lib/feedback";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-4 w-4",
            n <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-neutral-300 dark:text-neutral-600"
          )}
        />
      ))}
    </span>
  );
}

export function FeedbackList({
  items,
  locale,
}: {
  items: FeedbackItem[];
  locale: string;
}) {
  const t = useT().feedback;
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <FeedbackCard key={item.recordId} item={item} t={t} dateFmt={dateFmt} />
      ))}
    </div>
  );
}

function FeedbackCard({
  item,
  t,
  dateFmt,
}: {
  item: FeedbackItem;
  t: ReturnType<typeof useT>["feedback"];
  dateFmt: Intl.DateTimeFormat;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<FeedbackResponseState, FormData>(
    respondToFeedbackAction.bind(null, item.recordId),
    undefined
  );

  // Collapse the editor after a successful save (the list revalidates).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.ok) setOpen(false);
  }, [state?.ok]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Stars rating={item.rating} />
            <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {item.customerName}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
            #{item.jobNumber} · {t.byWorker.replace("{name}", item.workerName)}
            {item.ratedAt ? ` · ${dateFmt.format(new Date(item.ratedAt))}` : ""}
          </p>
        </div>
        <Link
          href={`/admin/records/${item.recordId}`}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {t.viewRecord}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {item.feedback && (
        <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">
          “{item.feedback}”
        </p>
      )}

      {/* Existing business reply */}
      {item.response && !open && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <MessageSquare className="h-3.5 w-3.5" />
            {t.responseLabel}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">
            {item.response}
          </p>
        </div>
      )}

      {open ? (
        <form action={formAction} className="flex flex-col gap-2">
          <label htmlFor={`resp-${item.recordId}`} className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t.yourResponse}
          </label>
          <Textarea
            id={`resp-${item.recordId}`}
            name="response"
            rows={3}
            defaultValue={item.response ?? ""}
            placeholder={t.responsePlaceholder}
            maxLength={1000}
            autoFocus
          />
          {state?.error && <p className="text-xs text-destructive-text">{t.responseError}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? t.saving : t.sendResponse}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            <MessageSquare className="h-4 w-4" />
            {item.response ? t.editResponse : t.respond}
          </Button>
        </div>
      )}
    </div>
  );
}
