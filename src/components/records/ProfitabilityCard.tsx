"use client";

import { useState, useTransition } from "react";
import { Pencil, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setJobValueAction } from "@/actions/costing";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatMoney } from "@/lib/format";
import { computeProfitability } from "@/lib/profitability";
import { cn } from "@/lib/utils";

// One line in the cost breakdown: a label and its (subtracted) amount.
function CostRow({ label, value, fmt }: { label: string; value: number; fmt: (n: number) => string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="tabular-nums text-neutral-700 dark:text-neutral-200">
        {value > 0 ? `− ${fmt(value)}` : fmt(0)}
      </span>
    </div>
  );
}

export function ProfitabilityCard({
  recordId,
  revenue,
  revenueFromInvoice,
  jobValue,
  labor,
  materials,
  expenses,
  currency,
}: {
  recordId: string;
  revenue: number;
  // True when revenue came from a linked invoice (manual value is then locked).
  revenueFromInvoice: boolean;
  jobValue: number | null;
  labor: number;
  materials: number;
  expenses: number;
  currency: string;
}) {
  const t = useT().profitability;
  const tc = useT().common;
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const fmt = (n: number) => formatMoney(n, currency);

  const p = computeProfitability({ revenue, labor, materials, expenses });
  const hasRevenue = revenue > 0;
  const positive = p.margin >= 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <TrendingUp className="h-3.5 w-3.5" />
            {t.title}
          </span>
          {!revenueFromInvoice && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <Pencil className="h-3.5 w-3.5" />
              {hasRevenue ? t.editRevenue : t.setRevenue}
            </button>
          )}
        </div>

        {/* Revenue */}
        <div className="flex items-center justify-between">
          <span className="flex flex-col">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{t.revenue}</span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              {revenueFromInvoice ? t.fromInvoice : t.manualValue}
            </span>
          </span>
          <span className="tabular-nums text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {fmt(p.revenue)}
          </span>
        </div>

        {editing && !revenueFromInvoice && (
          <form
            action={(formData) => {
              startTransition(async () => {
                await setJobValueAction(recordId, formData);
                setEditing(false);
              });
            }}
            className="flex items-end gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <label className="flex flex-1 flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {t.jobValue}
              </span>
              <Input
                name="jobValue"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                defaultValue={jobValue != null ? String(jobValue) : ""}
                placeholder={t.jobValuePlaceholder}
                autoFocus
              />
            </label>
            <Button type="submit" size="sm" disabled={pending}>
              {tc.save}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {tc.cancel}
            </Button>
          </form>
        )}

        {/* Cost breakdown */}
        <div className="flex flex-col gap-1.5 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <CostRow label={t.labor} value={p.labor} fmt={fmt} />
          <CostRow label={t.materials} value={p.materials} fmt={fmt} />
          <CostRow label={t.expenses} value={p.expenses} fmt={fmt} />
          <div className="flex items-center justify-between border-t border-dashed border-neutral-200 pt-1.5 text-sm dark:border-neutral-800">
            <span className="text-neutral-500 dark:text-neutral-400">{t.totalCost}</span>
            <span className="tabular-nums font-medium text-neutral-700 dark:text-neutral-200">
              {fmt(p.cost)}
            </span>
          </div>
        </div>

        {/* Margin */}
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2.5",
            !hasRevenue
              ? "bg-neutral-100 dark:bg-neutral-800"
              : positive
                ? "bg-emerald-50 dark:bg-emerald-950/40"
                : "bg-red-50 dark:bg-red-950/40"
          )}
        >
          <span
            className={cn(
              "text-sm font-medium",
              !hasRevenue
                ? "text-neutral-600 dark:text-neutral-300"
                : positive
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-red-700 dark:text-red-300"
            )}
          >
            {t.margin}
            {p.marginPct != null && (
              <span className="ml-1.5 font-normal opacity-80">
                ({p.marginPct > 0 ? "+" : ""}
                {p.marginPct}%)
              </span>
            )}
          </span>
          <span
            className={cn(
              "text-lg font-semibold tabular-nums",
              !hasRevenue
                ? "text-neutral-700 dark:text-neutral-200"
                : positive
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-red-700 dark:text-red-300"
            )}
          >
            {fmt(p.margin)}
          </span>
        </div>

        {!hasRevenue && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{t.noRevenueHint}</p>
        )}
      </CardContent>
    </Card>
  );
}
