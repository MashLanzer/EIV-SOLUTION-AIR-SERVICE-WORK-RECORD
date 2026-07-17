"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/LocaleProvider";

// Shows a day's job cards in a bottom sheet instead of stacking them under the
// month calendar. Open state rides on the ?day=1 query param (set when a day is
// tapped), so the sheet opens over the calendar and the page stays compact. The
// day's cards are rendered by the server and passed in as children.
export function DaySheet({ title, children }: { title: string; children: ReactNode }) {
  const tc = useT().common;
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = params.get("day") === "1";

  function close() {
    const p = new URLSearchParams(params.toString());
    p.delete("day");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <BottomSheet open={open} onClose={close} title={title} closeLabel={tc.close}>
      {children}
    </BottomSheet>
  );
}
