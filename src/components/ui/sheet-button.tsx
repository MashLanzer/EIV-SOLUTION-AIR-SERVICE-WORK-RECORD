"use client";

import { useState, type ReactNode } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/LocaleProvider";

// A trigger that opens its content in a bottom sheet, so an "add / edit" panel
// (member list, project assignment, team settings) never takes up page space
// until the user asks for it. `trigger` is the button's visual content (icon +
// label) and `children` the sheet body — both server-rendered and passed in as
// slots, since a Server Component can't hand a Client Component a raw icon
// component as a prop.
export function SheetButton({
  trigger,
  title,
  className,
  children,
}: {
  trigger: ReactNode;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {trigger}
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={title} closeLabel={tc.close}>
        {children}
      </BottomSheet>
    </>
  );
}
