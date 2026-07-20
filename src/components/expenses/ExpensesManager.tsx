"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Camera,
  FolderKanban,
  Plus,
  Receipt,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  addExpenseCategoryAction,
  createExpenseAction,
  deleteExpenseAction,
  deleteExpenseCategoryAction,
  updateExpenseAction,
} from "@/actions/expenses";
import { useT } from "@/components/i18n/LocaleProvider";
import { formatMoney } from "@/lib/format";

export interface ExpenseRow {
  id: string;
  vendor: string;
  amount: number;
  date: string; // ISO
  categoryId: string | null;
  categoryName: string | null;
  projectId: string | null;
  projectName: string | null;
  note: string | null;
  receiptUrl: string | null;
}
interface Named {
  id: string;
  name: string;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;

async function compressToBlob(file: File): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("read"));
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ctx");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", JPEG_QUALITY)
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function isoDay(iso: string) {
  return iso.slice(0, 10);
}

export function ExpensesManager({
  expenses,
  categories,
  projects,
  currency,
  filtering,
}: {
  expenses: ExpenseRow[];
  categories: Named[];
  projects: Named[];
  currency: string;
  filtering: boolean;
}) {
  const t = useT().expenses;
  const tc = useT().common;
  const [editing, setEditing] = useState<ExpenseRow | "new" | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const fmt = (n: number) => formatMoney(n, currency);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }),
    []
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          {t.newExpense}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setCatsOpen(true)}>
          <TagIcon className="h-4 w-4" />
          {t.manageCategories}
        </Button>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filtering ? t.noMatches : t.emptyTitle}
          description={filtering ? t.noMatchesDesc : t.emptyDesc}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {expenses.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEditing(e)}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                {e.receiptUrl ? <Receipt className="h-4 w-4" /> : <TagIcon className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {e.vendor}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="tabular-nums">{dateFmt.format(new Date(e.date))}</span>
                  {e.categoryName && <span>· {e.categoryName}</span>}
                  {e.projectName && (
                    <span className="flex items-center gap-1">
                      · <FolderKanban className="h-3 w-3 shrink-0" />
                      {e.projectName}
                    </span>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {fmt(e.amount)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Create / edit sheet */}
      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" || editing === null ? t.newExpense : t.editTitle}
        closeLabel={tc.close}
      >
        {editing !== null && (
          <ExpenseForm
            key={editing === "new" ? "new" : editing.id}
            expense={editing === "new" ? null : editing}
            categories={categories}
            projects={projects}
            onDone={() => setEditing(null)}
          />
        )}
      </BottomSheet>

      {/* Categories sheet */}
      <BottomSheet
        open={catsOpen}
        onClose={() => setCatsOpen(false)}
        title={t.categoriesTitle}
        closeLabel={tc.close}
      >
        <CategoryManager categories={categories} />
      </BottomSheet>
    </>
  );
}

function ExpenseForm({
  expense,
  categories,
  projects,
  onDone,
}: {
  expense: ExpenseRow | null;
  categories: Named[];
  projects: Named[];
  onDone: () => void;
}) {
  const t = useT().expenses;
  const tc = useT().common;
  const [pending, startTransition] = useTransition();
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receiptUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    setBusy(true);
    try {
      const blob = await compressToBlob(file);
      const fd = new FormData();
      fd.append("file", blob, "receipt.jpg");
      const res = await fetch("/api/expenses/receipt", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload");
      const { url } = (await res.json()) as { url: string };
      setReceiptUrl(url);
    } catch {
      setError(t.uploading);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          if (expense) await updateExpenseAction(expense.id, formData);
          else await createExpenseAction(formData);
          onDone();
        });
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="receiptUrl" value={receiptUrl ?? ""} />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.vendor}</span>
        <Input name="vendor" required maxLength={120} defaultValue={expense?.vendor ?? ""} placeholder={t.vendorPlaceholder} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.amount}</span>
          <Input name="amount" type="number" step="0.01" min="0" inputMode="decimal" required defaultValue={expense ? String(expense.amount) : ""} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.date}</span>
          <Input name="date" type="date" required defaultValue={expense ? isoDay(expense.date) : todayIso()} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.category}</span>
          <Select name="categoryId" defaultValue={expense?.categoryId ?? ""}>
            <option value="">{t.uncategorized}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.project}</span>
          <Select name="projectId" defaultValue={expense?.projectId ?? ""}>
            <option value="">{t.projectNone}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.note}</span>
        <Input name="note" maxLength={500} defaultValue={expense?.note ?? ""} placeholder={t.notePlaceholder} />
      </label>

      {/* Receipt */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <div className="flex items-center gap-3">
        {receiptUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptUrl} alt="" className="h-12 w-12 rounded-lg border border-neutral-200 object-cover dark:border-neutral-700" />
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
              {t.changeReceipt}
            </Button>
            <button type="button" onClick={() => setReceiptUrl(null)} className="text-neutral-400 hover:text-destructive" aria-label={t.removeReceipt}>
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Camera className="h-4 w-4" />
            {busy ? t.uploading : t.addReceipt}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending || busy} className="flex-1">
          {pending ? t.saving : t.save}
        </Button>
        {expense && !confirmDelete && (
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {expense && confirmDelete && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 bg-destructive-soft px-3 py-2 text-sm">
          <span className="text-destructive-text">{t.deleteTitle}</span>
          <span className="flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
              {tc.cancel}
            </button>
            <button
              type="button"
              onClick={() => startTransition(async () => { await deleteExpenseAction(expense.id); onDone(); })}
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

function CategoryManager({ categories }: { categories: Named[] }) {
  const t = useT().expenses;
  const [, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.categoriesDesc}</p>
      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {c.name}
              <button
                type="button"
                onClick={() => startTransition(() => deleteExpenseCategoryAction(c.id))}
                className="ml-0.5 text-neutral-400 hover:text-destructive"
                aria-label={`${t.delete} ${c.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-400">{t.noCategoriesYet}</p>
      )}
      <form action={addExpenseCategoryAction} className="flex gap-2">
        <Input name="name" placeholder={t.categoryNamePlaceholder} maxLength={60} className="flex-1" required />
        <Button type="submit" variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          {t.addCategory}
        </Button>
      </form>
    </div>
  );
}
