"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Boxes, LayoutGrid } from "lucide-react";

import { useT } from "@/components/i18n/LocaleProvider";

// A small "tools" menu in the header: a grid-icon button that drops a menu of
// secondary tools. Starts with Materials; it's a deliberate container so more
// tools can be added here without crowding the primary nav.
export function HeaderToolsMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.tools.title}
        title={t.tools.title}
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 active:scale-95 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {t.tools.title}
          </p>
          <Link href="/admin/materials" role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
            <Boxes className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            {t.nav.materials}
          </Link>
        </div>
      )}
    </div>
  );
}
