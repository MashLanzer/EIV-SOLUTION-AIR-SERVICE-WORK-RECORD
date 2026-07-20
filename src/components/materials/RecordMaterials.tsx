"use client";

import { useMemo, useState, useTransition } from "react";
import { Package, Plus, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { addRecordMaterialAction, removeRecordMaterialAction } from "@/actions/materials";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatMoney } from "@/lib/format";

export interface RecordMaterialLine {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
}
interface CatalogMaterial {
  id: string;
  name: string;
  unit: string | null;
  unitCost: number;
}

export function RecordMaterials({
  recordId,
  lines,
  catalog,
  currency,
}: {
  recordId: string;
  lines: RecordMaterialLine[];
  catalog: CatalogMaterial[];
  currency: string;
}) {
  const t = useT().materials;
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  // "" = pick a custom item; otherwise a catalog material id.
  const [selected, setSelected] = useState("");
  const fmt = (n: number) => formatMoney(n, currency);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0),
    [lines]
  );
  const isCustom = selected === "";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.sectionTitle}
          </span>
          {!adding && (
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" />
              {t.addMaterial}
            </Button>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.noneOnRecord}</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  <Package className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {l.name}
                  </p>
                  <p className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                    {l.quantity} × {fmt(l.unitCost)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {fmt(l.quantity * l.unitCost)}
                </span>
                <button
                  type="button"
                  onClick={() => startTransition(() => removeRecordMaterialAction(l.id))}
                  disabled={pending}
                  className="shrink-0 text-neutral-400 hover:text-destructive disabled:opacity-50"
                  aria-label={t.remove}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {lines.length > 0 && (
          <div className="flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {t.materialsTotal}
            </span>
            <span className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {fmt(total)}
            </span>
          </div>
        )}

        {adding && (
          <form
            action={(formData) => {
              startTransition(async () => {
                await addRecordMaterialAction(recordId, formData);
                setAdding(false);
                setSelected("");
              });
            }}
            className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {t.chooseMaterial}
              </span>
              <Select
                name="materialId"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">{t.customItem}</option>
                {catalog.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {fmt(m.unitCost)}
                    {m.unit ? ` / ${m.unit}` : ""}
                  </option>
                ))}
              </Select>
            </label>

            {isCustom && (
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {t.name}
                  </span>
                  <Input name="name" maxLength={120} required placeholder={t.namePlaceholder} />
                </label>
                <label className="col-span-2 flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {t.unitCost}
                  </span>
                  <Input
                    name="unitCost"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    required
                  />
                </label>
              </div>
            )}

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {t.quantity}
              </span>
              <Input
                name="quantity"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                required
                defaultValue="1"
              />
            </label>

            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending} className="flex-1">
                {t.add}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setSelected("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
