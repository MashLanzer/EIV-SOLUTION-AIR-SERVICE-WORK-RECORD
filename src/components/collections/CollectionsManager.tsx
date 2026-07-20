"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { emailInvoiceAction, setInvoiceStatusAction } from "@/actions/invoices";
import type { EmailSendResult } from "@/actions/invoices";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatMoney } from "@/lib/format";
import {
  COLLECTION_BUCKETS,
  isBucketOverdue,
  type CollectionBucketKey,
} from "@/lib/collections";
import { cn } from "@/lib/utils";

export interface CollectionRow {
  id: string;
  number: string; // formatted, e.g. INV-0007
  customerName: string;
  hasEmail: boolean;
  total: number;
  days: number; // days overdue (>=1) or non-positive for due-soon
  bucket: CollectionBucketKey;
}

export function CollectionsManager({
  rows,
  currency,
}: {
  rows: CollectionRow[];
  currency: string;
}) {
  const t = useT().collections;
  const fmt = (n: number) => formatMoney(n, currency);

  if (rows.length === 0) {
    return <EmptyState icon={CheckCircle2} title={t.emptyTitle} description={t.emptyDesc} />;
  }

  const bucketLabel: Record<CollectionBucketKey, string> = {
    d61plus: t.bucket61,
    d31_60: t.bucket3160,
    d1_30: t.bucket130,
    due_soon: t.bucketDueSoon,
  };

  return (
    <div className="flex flex-col gap-5">
      {COLLECTION_BUCKETS.map((key) => {
        const group = rows.filter((r) => r.bucket === key);
        if (group.length === 0) return null;
        const subtotal = group.reduce((s, r) => s + r.total, 0);
        const overdue = isBucketOverdue(key);
        return (
          <section key={key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    overdue ? "bg-red-500" : "bg-amber-500"
                  )}
                  aria-hidden="true"
                />
                {bucketLabel[key]}
                <span className="font-normal text-neutral-400 dark:text-neutral-500">
                  · {group.length}
                </span>
              </span>
              <span className="text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                {fmt(subtotal)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {group.map((r) => (
                <CollectionCard key={r.id} row={r} currency={currency} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CollectionCard({ row, currency }: { row: CollectionRow; currency: string }) {
  const t = useT().collections;
  const [pending, startTransition] = useTransition();
  const [emailing, startEmail] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const fmt = (n: number) => formatMoney(n, currency);
  const overdue = row.days >= 1;

  function sendReminder() {
    setFeedback(null);
    startEmail(async () => {
      const res: EmailSendResult = await emailInvoiceAction(row.id);
      if ("ok" in res) setFeedback({ ok: true, text: t.reminderSent });
      else
        setFeedback({
          ok: false,
          text:
            res.error === "no_email"
              ? t.reminderNoEmail
              : res.error === "not_configured"
                ? t.reminderNotConfigured
                : t.reminderFailed,
        });
    });
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
            <span className="tabular-nums">{row.number}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                overdue
                  ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              )}
            >
              {overdue
                ? t.daysLate.replace("{n}", String(row.days))
                : row.days === 0
                  ? t.dueToday
                  : t.dueInDays.replace("{n}", String(Math.abs(row.days)))}
            </span>
          </p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {row.customerName}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
          {fmt(row.total)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => startTransition(() => setInvoiceStatusAction(row.id, "PAID"))} disabled={pending}>
          <CheckCircle2 className="h-4 w-4" />
          {t.markPaid}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={sendReminder}
          disabled={emailing || !row.hasEmail}
          title={row.hasEmail ? undefined : t.reminderNoEmail}
        >
          <Send className="h-4 w-4" />
          {emailing ? t.sending : t.sendReminder}
        </Button>
        <Link
          href={`/admin/invoices/${row.id}`}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          {t.view}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {feedback && (
        <p
          className={cn(
            "text-xs",
            feedback.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
          )}
          role="status"
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
