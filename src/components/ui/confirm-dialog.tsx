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
  confirmVariant = "destructive",
  trigger,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  // Defaults to the destructive (red) button so existing callers are
  // unchanged; pass "default" for benign confirmations (e.g. create
  // admin account, change email) where red is the wrong signal.
  confirmVariant?: "default" | "destructive";
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
        className="m-auto w-[calc(100vw-2rem)] max-w-sm animate-fade-up rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl backdrop:bg-black/40"
      >
        <h2 id={titleId} className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
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
            variant={confirmVariant}
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
