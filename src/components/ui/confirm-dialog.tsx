"use client";

import { useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

// Native <dialog>-based confirmation: modal, focus-trapped, Escape and
// backdrop-click to dismiss - replaces window.confirm(), which isn't
// styleable or reliably accessible.
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  trigger,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  // Any clickable content (e.g. a Button without its own onClick);
  // clicking it opens the dialog.
  trigger: ReactNode;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <>
      <span
        className="contents"
        onClick={() => dialogRef.current?.showModal()}
      >
        {trigger}
      </span>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => {
          // Clicks on the backdrop land on the dialog element itself
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-sm animate-fade-up rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl backdrop:bg-black/40"
      >
        <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={(e) => {
              e.currentTarget.closest("dialog")?.close();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
