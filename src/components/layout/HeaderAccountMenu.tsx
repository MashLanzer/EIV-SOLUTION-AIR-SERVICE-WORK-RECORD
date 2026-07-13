"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import { signOut } from "next-auth/react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters =
    (parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "");
  return letters.toUpperCase();
}

// The account menu that replaces the old header Settings button: an avatar +
// chevron that drops a small menu with Profile, Settings and Sign out. Sign out
// and Profile used to live in the native center-menu sheet; they now live here,
// so the account lives in one predictable place on every screen.
export function HeaderAccountMenu({
  name,
  avatarUrl,
  profileHref,
  settingsHref,
}: {
  name: string;
  avatarUrl?: string | null;
  profileHref: string;
  settingsHref: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useT().account;
  const ts = useT().settings;

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
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.menuAria}
        className="flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-95"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            aria-hidden="true"
            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-200 ring-1 ring-neutral-200 dark:ring-neutral-700"
          >
            {initialsOf(name)}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-neutral-400 dark:text-neutral-500 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 origin-top-right animate-fade-up rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1.5 shadow-lg shadow-black/10"
        >
          <div className="flex items-center gap-2 px-2.5 py-2">
            <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {name || t.yourAccount}
            </span>
          </div>
          <div className="mb-1 border-t border-neutral-100 dark:border-neutral-800" />

          <Link
            href={profileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <UserIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            {t.profile}
          </Link>
          <Link
            href={settingsHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <Settings className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            {t.settings}
          </Link>

          <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

          {/* The confirm modal is a native <dialog> rendered here as a child of
              the menu, so opening it does not trip the click-outside handler and
              it survives while the menu stays mounted. */}
          <ConfirmDialog
            title={ts.signOutTitle}
            description={ts.signOutDescription}
            confirmLabel={ts.signOut}
            trigger={
              <button type="button" role="menuitem" className={cn(itemClass, "text-destructive-text")}>
                <LogOut className="h-4 w-4" />
                {ts.signOut}
              </button>
            }
            onConfirm={() => signOut({ redirectTo: "/login" })}
          />
        </div>
      )}
    </div>
  );
}
