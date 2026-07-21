"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown, Flag, LayoutList, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  OrgPlanFilter,
  OrgSort,
  OrgStatusFilter,
} from "@/lib/platform";

export type OrgView = "list" | "table";

type Controls = {
  status: OrgStatusFilter;
  plan: OrgPlanFilter;
  sort: OrgSort;
  watched: boolean;
  view: OrgView;
};

const STATUS: { value: OrgStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

const PLAN: { value: OrgPlanFilter; label: string }[] = [
  { value: "all", label: "All plans" },
  { value: "PRO", label: "Pro" },
  { value: "FREE", label: "Free" },
  { value: "none", label: "No plan" },
];

const SORT: { value: OrgSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name (A–Z)" },
  { value: "health", label: "Lowest health first" },
  { value: "recent", label: "Most recently active" },
  { value: "idle", label: "Gone quiet (most idle)" },
  { value: "users", label: "Most users" },
  { value: "records", label: "Most records" },
];

// Filters + sort for the Companies list. Drives the URL (searchParams) so the
// page re-renders on the server with the narrowed/sorted set; defaults are
// omitted from the URL to keep it clean. One compact row on mobile.
export function OrgListControls({ current }: { current: Controls }) {
  const router = useRouter();

  const go = (next: Partial<Controls>) => {
    const merged = { ...current, ...next };
    const p = new URLSearchParams();
    if (merged.status !== "all") p.set("status", merged.status);
    if (merged.plan !== "all") p.set("plan", merged.plan);
    if (merged.sort !== "newest") p.set("sort", merged.sort);
    if (merged.watched) p.set("watched", "1");
    if (merged.view !== "list") p.set("view", merged.view);
    const qs = p.toString();
    router.push(qs ? `/super/orgs?${qs}` : "/super/orgs");
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS.map((s) => (
            <Pill key={s.value} active={current.status === s.value} onClick={() => go({ status: s.value })}>
              {s.label}
            </Pill>
          ))}
        </div>
        <span className="hidden h-4 w-px bg-neutral-200 dark:bg-neutral-700 sm:inline-block" />
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PLAN.map((p) => (
            <Pill key={p.value} active={current.plan === p.value} onClick={() => go({ plan: p.value })}>
              {p.label}
            </Pill>
          ))}
        </div>
        <span className="hidden h-4 w-px bg-neutral-200 dark:bg-neutral-700 sm:inline-block" />
        <Pill active={current.watched} onClick={() => go({ watched: !current.watched })}>
          <Flag className={cn("h-3.5 w-3.5", current.watched && "fill-current")} />
          Watched
        </Pill>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="relative flex items-center">
          <ArrowUpDown className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
          <span className="sr-only">Sort companies</span>
          <select
            value={current.sort}
            onChange={(e) => go({ sort: e.target.value as OrgSort })}
            className="appearance-none rounded-full border border-neutral-300 bg-white py-1.5 pl-8 pr-8 text-sm font-medium text-neutral-700 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            {SORT.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center rounded-full border border-neutral-300 p-0.5 dark:border-neutral-700">
          <ViewButton active={current.view === "list"} onClick={() => go({ view: "list" })} label="List view">
            <LayoutList className="h-4 w-4" />
          </ViewButton>
          <ViewButton active={current.view === "table"} onClick={() => go({ view: "table" })} label="Table view">
            <Table2 className="h-4 w-4" />
          </ViewButton>
        </div>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      )}
    >
      {children}
    </button>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      )}
    >
      {children}
    </button>
  );
}
