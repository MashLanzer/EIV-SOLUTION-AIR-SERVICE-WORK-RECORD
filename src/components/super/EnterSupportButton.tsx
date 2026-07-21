"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Eye, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { enterOrgAction } from "@/actions/impersonation";
import { cn } from "@/lib/utils";

// The primary action on a company: enter it as support. A split button —
// the main press enters with full access, the caret opens the read-only
// ("View only") variant — so the two support modes read as one action
// instead of two competing buttons.
export function EnterSupportButton({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <form action={enterOrgAction.bind(null, orgId, "FULL")}>
        <Button type="submit" size="sm" className="rounded-r-none">
          <LogIn className="h-4 w-4" />
          Enter as support
        </Button>
      </form>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More access options"
        className="rounded-l-none border-l border-primary-foreground/25 px-2"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-44 origin-top-right animate-scale-in rounded-lg border border-neutral-200 bg-white p-1 shadow-lg shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <form action={enterOrgAction.bind(null, orgId, "READ_ONLY")}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <Eye className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              View only
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
