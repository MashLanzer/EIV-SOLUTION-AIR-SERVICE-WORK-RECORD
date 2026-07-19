"use client";

import { useState, type ReactNode } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// A small trigger that opens its content in a bottom sheet. Used to tuck
// secondary day-view info (e.g. the driving route) behind a chip so it doesn't
// stack down the page, while the primary schedule stays visible. Pass className
// to override the default inline pill (e.g. a full-width grid cell).
export function SheetButton({
  label,
  icon,
  title,
  className,
  children,
}: {
  label: string;
  icon?: ReactNode;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:border-neutral-700",
          className
        )}
      >
        {icon}
        {label}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={title} closeLabel={tc.close}>
        {children}
      </BottomSheet>
    </>
  );
}
