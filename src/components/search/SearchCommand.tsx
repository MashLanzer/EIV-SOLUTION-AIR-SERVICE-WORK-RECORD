"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Contact,
  FolderKanban,
  Loader2,
  Search,
  SearchX,
  Users,
  Users2,
  X,
  type LucideIcon,
} from "lucide-react";

import { globalSearchAction } from "@/actions/search";
import type { SearchGroup, SearchGroupType } from "@/lib/globalSearch";

const GROUP_ICON: Record<SearchGroupType, LucideIcon> = {
  records: ClipboardList,
  customers: Contact,
  projects: FolderKanban,
  workers: Users,
  teams: Users2,
};

// A command-palette style global search opened from the header. Results stream
// in live (debounced) from the role-scoped server action; the palette never
// leaves the current page. Cmd/Ctrl+K opens it from anywhere.
export function SearchCommand() {
  const [open, setOpen] = useState(false);

  // Global shortcut to open the palette (Cmd/Ctrl+K), like most desktop apps.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-95"
      >
        <Search className="h-4 w-4" />
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = useCallback((raw: string) => {
    setQuery(raw);
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = raw.trim();
    if (q.length < 2) {
      seqRef.current += 1; // cancel any in-flight result
      setGroups([]);
      return;
    }
    timerRef.current = setTimeout(() => {
      const seq = ++seqRef.current;
      startTransition(async () => {
        const res = await globalSearchAction(q);
        // Ignore stale responses that resolved after a newer keystroke.
        if (seq === seqRef.current) setGroups(res);
      });
    }, 250);
  }, []);

  const trimmed = query.trim();
  const firstHref = groups[0]?.items[0]?.href;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (firstHref) {
      onClose();
      router.push(firstHref);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 top-0 flex justify-center px-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:pt-[10vh]">
        <div className="flex max-h-[85vh] w-full max-w-xl animate-fade-up flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl">
          <form onSubmit={onSubmit} className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 px-3">
            {pending ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-neutral-400 dark:text-neutral-500" />
            ) : (
              <Search className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => run(e.target.value)}
              type="text"
              placeholder="Search records, customers, projects…"
              aria-label="Search"
              className="h-12 flex-1 bg-transparent text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {trimmed.length < 2 ? (
              <Hint text="Type at least 2 characters to search." />
            ) : groups.length === 0 && !pending ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <SearchX className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No results for “{trimmed}”.
                </p>
              </div>
            ) : (
              <SearchResultsList groups={groups} onSelect={onClose} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// The grouped results list, split out so its layout can be verified in
// isolation (and reused if search grows a full-page view later).
export function SearchResultsList({
  groups,
  onSelect,
}: {
  groups: SearchGroup[];
  onSelect?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const Icon = GROUP_ICON[group.type];
        return (
          <div key={group.type} className="flex flex-col gap-1">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {group.label}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={onSelect}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {item.subtitle}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <Search className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{text}</p>
    </div>
  );
}
