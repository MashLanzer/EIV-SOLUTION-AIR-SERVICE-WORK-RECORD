"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/LocaleProvider";

// A compact action tile that opens its content in a bottom sheet, so an
// "add / edit" panel (member list, project assignment, team settings) never
// takes up page space until the user asks for it. The children are rendered by
// the server (forms with their server actions) and passed in as a slot.
export function SheetButton({
  icon: Icon,
  label,
  title,
  className,
  children,
}: {
  icon: LucideIcon;
  label: string;
  // Sheet header title (defaults to the trigger label).
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Icon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
        <span className="text-[11px] font-medium leading-tight">{label}</span>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={title ?? label} closeLabel={tc.close}>
        {children}
      </BottomSheet>
    </>
  );
}
