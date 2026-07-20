"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, LineChart } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/LocaleProvider";

// A single compact trigger that tucks the heavier charts (revenue trend,
// forecast, money-flow) into a bottom sheet, so they no longer sit on top of
// the page pushing the KPIs and the tab nav down. One tap away — same access,
// far less scroll.
export function FinancialsInsightsSheet({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const dict = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:text-neutral-100"
      >
        <LineChart className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
        <span className="min-w-0 flex-1 text-left">{label}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={label} closeLabel={dict.common.close}>
        <div className="flex flex-col gap-4">{children}</div>
      </BottomSheet>
    </>
  );
}
