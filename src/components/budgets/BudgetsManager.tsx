"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Wallet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { setCategoryBudgetAction } from "@/actions/budgets";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatMoney } from "@/lib/format";
import { budgetStatus, type BudgetState } from "@/lib/budgets";
import { cn } from "@/lib/utils";

export interface BudgetRow {
  id: string;
  name: string;
  spent: number;
  budget: number | null;
}

const BAR: Record<BudgetState, string> = {
  ok: "bg-emerald-500",
  near: "bg-amber-500",
  over: "bg-red-500",
};
const TEXT: Record<BudgetState, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  near: "text-amber-600 dark:text-amber-400",
  over: "text-red-600 dark:text-red-400",
};

export function BudgetsManager({
  rows,
  currency,
}: {
  rows: BudgetRow[];
  currency: string;
}) {
  const t = useT().budgets;

  if (rows.length === 0) {
    return <EmptyState icon={Wallet} title={t.emptyTitle} description={t.emptyDesc} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <BudgetCard key={r.id} row={r} currency={currency} />
      ))}
    </div>
  );
}

function BudgetCard({ row, currency }: { row: BudgetRow; currency: string }) {
  const t = useT().budgets;
  const tc = useT().common;
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const fmt = (n: number) => formatMoney(n, currency);
  const hasBudget = row.budget != null && row.budget > 0;
  const status = budgetStatus(row.spent, row.budget ?? 0);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {row.name}
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <Pencil className="h-3.5 w-3.5" />
            {hasBudget ? t.edit : t.setBudget}
          </button>
        )}
      </div>

      {editing ? (
        <form
          action={(formData) => {
            startTransition(async () => {
              await setCategoryBudgetAction(row.id, formData);
              setEditing(false);
            });
          }}
          className="flex items-center gap-2"
        >
          <Input
            name="monthlyBudget"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={row.budget != null ? String(row.budget) : ""}
            placeholder={t.budgetPlaceholder}
            autoFocus
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={pending} aria-label={tc.save}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            aria-label={tc.cancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </form>
      ) : hasBudget ? (
        <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={cn("h-full rounded-full transition-all", BAR[status.state])}
              style={{ width: `${status.pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="tabular-nums text-neutral-600 dark:text-neutral-300">
              {fmt(status.spent)}{" "}
              <span className="text-neutral-400 dark:text-neutral-500">/ {fmt(status.budget)}</span>
            </span>
            <span className={cn("font-medium tabular-nums", TEXT[status.state])}>
              {status.state === "over"
                ? t.overBy.replace("{amount}", fmt(Math.abs(status.remaining)))
                : t.leftLabel.replace("{amount}", fmt(status.remaining))}
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span className="tabular-nums">
            {fmt(row.spent)} {t.spentThisMonth}
          </span>
          <span className="text-neutral-400 dark:text-neutral-500">{t.noBudget}</span>
        </div>
      )}
    </div>
  );
}
