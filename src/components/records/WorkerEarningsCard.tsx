"use client";

import { useState } from "react";
import { ChevronRight, Wallet } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatMoney } from "@/lib/format";

export type EarningsMonth = { label: string; amount: number };

// A worker-facing earnings summary: this month's lead-installer pay up front,
// with a tap opening a 6-month breakdown. Ties the records list to the pay
// concept the worker sees on their profile. Read-only — no customer data.
export function WorkerEarningsCard({
  thisMonth,
  lastMonth,
  months,
  currency = "$",
}: {
  thisMonth: number;
  lastMonth: number;
  months: EarningsMonth[];
  currency?: string;
}) {
  const t = useT().records;
  const tc = useT().common;
  const [open, setOpen] = useState(false);
  const fmt = (n: number) => formatMoney(n, currency);
  const max = Math.max(1, ...months.map((m) => m.amount));

  return (
    <>
      <Card className="animate-fade-up transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
            <Wallet aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.earnedThisMonthLabel}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {fmt(thisMonth)}
              </span>
              <DeltaBadge current={thisMonth} previous={lastMonth} format={fmt} />
            </div>
          </div>
          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
        </button>
      </Card>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.myEarnings} closeLabel={tc.close}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.earnedThisMonthLabel}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {fmt(thisMonth)}
              </span>
              <DeltaBadge current={thisMonth} previous={lastMonth} format={fmt} />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.last6Months}
            </span>
            {months.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{m.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-neutral-800 dark:bg-neutral-200"
                    style={{ width: `${Math.round((m.amount / max) * 100)}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                  {fmt(m.amount)}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.earningsNote}</p>
        </div>
      </BottomSheet>
    </>
  );
}
