"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Search, SearchX, User as UserIcon, X } from "lucide-react";

import { platformSearchAction } from "@/actions/platformSearch";
import type { PlatformSearchResult } from "@/lib/platform";

const EMPTY: PlatformSearchResult = { companies: [], users: [] };

// A command-palette style search across every company and user, opened from
// the console header or with Cmd/Ctrl+K. Results stream in live (debounced)
// from the owner-only server action; selecting one navigates to that company.
export function SuperSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlatformSearchResult>(EMPTY);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(EMPTY);
  }, []);

  // Cmd/Ctrl+K from anywhere in the console.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced live search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      // Clearing stale results when the box is emptied — intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(EMPTY);
      return;
    }
    const id = setTimeout(() => {
      startTransition(async () => {
        setResults(await platformSearchAction(q));
      });
    }, 180);
    return () => clearTimeout(id);
  }, [query, open]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router]
  );

  const hasResults = results.companies.length > 0 || results.users.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search companies and users"
        className="flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-2.5 text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        <Search className="h-4 w-4" />
        <span className="hidden text-sm sm:inline">Search…</span>
        <kbd className="hidden rounded border border-neutral-200 px-1 text-[10px] text-neutral-400 dark:border-neutral-700 sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
          <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 mx-auto mt-[8vh] flex max-h-[80vh] w-full max-w-lg animate-fade-up flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-3 dark:border-neutral-800">
              <Search className="h-4 w-4 shrink-0 text-neutral-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search companies or users…"
                className="h-12 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
              />
              {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />}
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {query.trim() && !hasResults && !pending && (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-neutral-400">
                  <SearchX className="h-6 w-6" />
                  No matches for “{query.trim()}”.
                </div>
              )}

              {results.companies.length > 0 && (
                <Group label="Companies">
                  {results.companies.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => go(`/super/orgs/${c.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <Building2 className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="min-w-0 flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100">
                        {c.name}
                        <span className="ml-2 text-xs text-neutral-400">/{c.slug}</span>
                      </span>
                      {!c.active && (
                        <span className="shrink-0 rounded-full bg-destructive-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive-text">
                          Suspended
                        </span>
                      )}
                    </button>
                  ))}
                </Group>
              )}

              {results.users.length > 0 && (
                <Group label="Users">
                  {results.users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      disabled={!u.orgId}
                      onClick={() => u.orgId && go(`/super/orgs/${u.orgId}`)}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-neutral-100 disabled:cursor-default disabled:opacity-60 dark:hover:bg-neutral-800"
                    >
                      <UserIcon className="h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-neutral-900 dark:text-neutral-100">
                          {u.name || u.email}
                        </span>
                        <span className="block truncate text-xs text-neutral-400">
                          {u.email}
                          {u.orgName ? ` · ${u.orgName}` : " · no company"}
                        </span>
                      </span>
                    </button>
                  ))}
                </Group>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      {children}
    </div>
  );
}
