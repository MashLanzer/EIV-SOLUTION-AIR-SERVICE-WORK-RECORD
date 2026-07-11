"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

// A native-style bottom sheet: dimmed scrim + a panel that slides up from the
// bottom, respecting the safe-area inset. Shared chrome for the create sheet
// and the "More" sheet so both feel identical. Only ever shown at mobile width
// (sm:hidden); inside the APK that's the native surface.
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  // Small uppercase eyebrow at the top of the panel (e.g. "Create", "More").
  title?: string;
  // Accessible name for the dialog.
  label: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-40 sm:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.18)] transition-transform duration-200 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="relative flex items-center justify-center px-4 pb-1 pt-3">
          <span className="h-1 w-9 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-2 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {title && (
          <p className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {title}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
