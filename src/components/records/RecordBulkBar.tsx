"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/i18n/LocaleProvider";
import {
  bulkApproveRecordsAction,
  bulkRequestChangesAction,
} from "@/actions/records";

// A floating action bar for reviewing many records at once. It piggybacks on
// the row checkboxes already used for PDF export (input[name="ids"]) rather
// than adding a second set: whichever selected rows are still pending review
// can be approved or returned in one go. Bulk actions only ever touch
// SUBMITTED records server-side, so a mixed selection is safe.
export function RecordBulkBar({ pendingIds }: { pendingIds: string[] }) {
  const pendingSet = useRef(new Set(pendingIds));
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const returnRef = useRef<HTMLDialogElement>(null);
  const t = useT().adminRecords;
  const tc = useT().common;

  useEffect(() => {
    pendingSet.current = new Set(pendingIds);
  }, [pendingIds]);

  useEffect(() => {
    function recompute() {
      const checked = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked')
      ).map((i) => i.value);
      setSelected(checked.filter((v) => pendingSet.current.has(v)));
    }
    // A single delegated listener catches both individual checkboxes and the
    // "select all" toggle (which sets the row boxes before this bubbles up).
    document.addEventListener("change", recompute);
    recompute();
    return () => document.removeEventListener("change", recompute);
  }, []);

  function clearChecks() {
    document
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
      .forEach((c) => {
        if (c.name === "ids" || c.hasAttribute("data-select-all")) {
          c.checked = false;
        }
      });
    setSelected([]);
  }

  function approve() {
    const ids = [...selected];
    startTransition(async () => {
      await bulkApproveRecordsAction(ids);
      clearChecks();
    });
  }

  function submitReturn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const note = (
      e.currentTarget.elements.namedItem("reviewNote") as HTMLTextAreaElement
    ).value;
    const ids = [...selected];
    returnRef.current?.close();
    startTransition(async () => {
      await bulkRequestChangesAction(ids, note);
      clearChecks();
    });
  }

  const count = selected.length;
  if (count === 0) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-4 sm:bottom-6 sm:pl-60">
        <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 p-2 shadow-lg shadow-black/10 backdrop-blur animate-fade-up">
          <button
            type="button"
            onClick={clearChecks}
            aria-label={t.clearSelection}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
            {t.pendingSelected.replace("{n}", String(count))}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => returnRef.current?.showModal()}
            >
              <Undo2 className="h-4 w-4" />
              {t.return}
            </Button>
            <ConfirmDialog
              title={(count === 1 ? t.bulkApproveTitleOne : t.bulkApproveTitleMany).replace(
                "{n}",
                String(count)
              )}
              description={t.bulkApproveDesc}
              confirmLabel={t.approve}
              confirmVariant="default"
              onConfirm={approve}
              trigger={
                <Button type="button" size="sm" disabled={pending}>
                  <Check className="h-4 w-4" />
                  {t.approve}
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <dialog
        ref={returnRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-md animate-fade-up rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl backdrop:bg-black/40"
      >
        <form onSubmit={submitReturn}>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {(count === 1 ? t.bulkReturnTitleOne : t.bulkReturnTitleMany).replace(
              "{n}",
              String(count)
            )}
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {t.bulkReturnDesc}
          </p>
          <Textarea
            name="reviewNote"
            required
            rows={4}
            className="mt-3"
            placeholder={t.bulkReturnPlaceholder}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => returnRef.current?.close()}
            >
              {tc.cancel}
            </Button>
            <Button type="submit" variant="destructive">
              <Undo2 className="h-4 w-4" />
              {t.returnN.replace("{n}", String(count))}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
