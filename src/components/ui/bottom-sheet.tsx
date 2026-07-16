"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// A shared bottom sheet: slides up from the bottom on mobile, becomes a
// centered dialog on desktop, dims the page behind it and closes on Escape or
// backdrop tap. Used across the app to move "add / edit" panels off the page
// and into an overlay so screens stay compact and visual.
export function BottomSheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] animate-fade-up flex-col rounded-t-2xl border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg sm:rounded-2xl sm:border native:pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
