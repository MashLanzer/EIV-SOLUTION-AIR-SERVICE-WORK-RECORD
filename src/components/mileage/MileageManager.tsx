"use client";

import { useMemo, useState, useTransition } from "react";
import { Car, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { addMileageAction, deleteMileageAction } from "@/actions/mileage";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatMoney } from "@/lib/format";

export interface MileageRow {
  id: string;
  date: string; // ISO
  miles: number;
  note: string | null;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function MileageManager({
  entries,
  rate,
  currency,
}: {
  entries: MileageRow[];
  // Reimbursement per mile; null = don't show a money estimate.
  rate: number | null;
  currency: string;
}) {
  const t = useT().mileage;
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }),
    []
  );

  return (
    <div className="flex flex-col gap-3">
      {!adding && (
        <Button type="button" size="sm" onClick={() => setAdding(true)} className="w-fit">
          <Plus className="h-4 w-4" />
          {t.logMiles}
        </Button>
      )}

      {adding && (
        <form
          action={(formData) => {
            startTransition(async () => {
              await addMileageAction(formData);
              setAdding(false);
            });
          }}
          className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.date}</span>
              <Input name="date" type="date" required defaultValue={todayIso()} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.miles}</span>
              <Input
                name="miles"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                required
                autoFocus
                placeholder="0"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.note}</span>
            <Input name="note" maxLength={300} placeholder={t.notePlaceholder} />
          </label>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending} className="flex-1">
              {pending ? t.saving : t.save}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <EmptyState icon={Car} title={t.emptyTitle} description={t.emptyDesc} />
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <Car className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                  {e.miles} {t.miShort}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="tabular-nums">{dateFmt.format(new Date(e.date))}</span>
                  {e.note && <span className="truncate">· {e.note}</span>}
                </p>
              </div>
              {rate != null && (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
                  {formatMoney(e.miles * rate, currency)}
                </span>
              )}
              <button
                type="button"
                onClick={() => startTransition(() => deleteMileageAction(e.id))}
                disabled={pending}
                className="shrink-0 text-neutral-400 hover:text-destructive disabled:opacity-50"
                aria-label={t.delete}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
