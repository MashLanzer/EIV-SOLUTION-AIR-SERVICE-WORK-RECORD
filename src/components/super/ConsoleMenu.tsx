"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LogOut, Megaphone, MoreVertical, ShieldCheck, X } from "lucide-react";

import { AnnouncementControls } from "@/components/super/AnnouncementControls";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

// The console's overflow: a header menu for the infrequent owner tools that no
// longer warrant a nav tab — broadcast an announcement (in a sheet), jump to
// platform-admin management (owners only), and exit back to the app. Keeps the
// bottom bar down to four core tabs.
export function ConsoleMenu({
  announcement,
  isOwner,
}: {
  announcement: string | null;
  isOwner: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useBackDismiss(sheetOpen, closeSheet);
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [sheetOpen]);

  const itemClass =
    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Console menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 active:scale-95 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-52 origin-top-right animate-scale-in rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setMenuOpen(false);
              setSheetOpen(true);
            }}
          >
            <Megaphone className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            Announcement
          </button>
          {isOwner && (
            <Link href="/super/admins" role="menuitem" className={itemClass} onClick={() => setMenuOpen(false)}>
              <ShieldCheck className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              Platform admins
            </Link>
          )}
          <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
          <Link href="/admin" role="menuitem" className={itemClass} onClick={() => setMenuOpen(false)}>
            <LogOut className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            Exit to app
          </Link>
        </div>
      )}

      {sheetOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Announcement">
            <div className="absolute inset-0 bg-black/50" onClick={closeSheet} aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] animate-fade-up flex-col rounded-t-2xl border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl sm:border native:pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Broadcast</h2>
                <button
                  type="button"
                  onClick={closeSheet}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <AnnouncementControls current={announcement} />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
