"use client";

import { useState, useTransition } from "react";
import { Boxes, Package, Plus, Trash2 } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  createMaterialAction,
  deleteMaterialAction,
  updateMaterialAction,
} from "@/actions/materials";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatMoney } from "@/lib/format";

export interface MaterialRow {
  id: string;
  name: string;
  unit: string | null;
  unitCost: number;
}

export function MaterialsManager({
  materials,
  currency,
  filtering,
}: {
  materials: MaterialRow[];
  currency: string;
  filtering: boolean;
}) {
  const t = useT().materials;
  const tc = useT().common;
  const [editing, setEditing] = useState<MaterialRow | "new" | null>(null);
  const fmt = (n: number) => formatMoney(n, currency);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          {t.newMaterial}
        </Button>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={filtering ? t.noMatches : t.emptyTitle}
          description={filtering ? t.noMatchesDesc : t.emptyDesc}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setEditing(m)}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <Package className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {m.name}
                </p>
                {m.unit && (
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {m.unit}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {fmt(m.unitCost)}
                {m.unit && (
                  <span className="font-normal text-neutral-400 dark:text-neutral-500">
                    {" / "}
                    {m.unit}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" || editing === null ? t.newMaterial : t.editTitle}
        closeLabel={tc.close}
      >
        {editing !== null && (
          <MaterialForm
            key={editing === "new" ? "new" : editing.id}
            material={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        )}
      </BottomSheet>
    </>
  );
}

function MaterialForm({
  material,
  onDone,
}: {
  material: MaterialRow | null;
  onDone: () => void;
}) {
  const t = useT().materials;
  const tc = useT().common;
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          if (material) await updateMaterialAction(material.id, formData);
          else await createMaterialAction(formData);
          onDone();
        });
      }}
      className="flex flex-col gap-3"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.name}</span>
        <Input
          name="name"
          required
          maxLength={120}
          defaultValue={material?.name ?? ""}
          placeholder={t.namePlaceholder}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.unitCost}</span>
          <Input
            name="unitCost"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            defaultValue={material ? String(material.unitCost) : ""}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {t.unitOptional}
          </span>
          <Input
            name="unit"
            maxLength={24}
            defaultValue={material?.unit ?? ""}
            placeholder={t.unitPlaceholder}
          />
        </label>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? t.saving : t.save}
        </Button>
        {material && !confirmDelete && (
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {material && confirmDelete && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive-soft px-3 py-2 text-sm">
          <span className="text-destructive-text">{t.deleteTitle}</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              {tc.cancel}
            </button>
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await deleteMaterialAction(material.id);
                  onDone();
                })
              }
              className="font-medium text-destructive-text"
            >
              {t.deleteConfirm}
            </button>
          </span>
        </div>
      )}
    </form>
  );
}
