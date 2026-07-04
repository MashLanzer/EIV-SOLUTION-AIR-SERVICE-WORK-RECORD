"use client";

import { useRef, type ReactNode } from "react";

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
        onClick={(e) => {
          // Clicks on the backdrop land on the dialog element itself
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-sm animate-fade-up rounded-lg border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-black/40"
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
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
