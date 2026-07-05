import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SortDir } from "@/lib/sort";

// A clickable table-header label that toggles server-side sort via
// ?sort=&dir= while preserving the other params (page resets to 1 since it
// isn't carried through).
export function SortHeader({
  column,
  label,
  sort,
  dir,
  basePath,
  params,
  align,
}: {
  column: string;
  label: string;
  sort: string;
  dir: SortDir;
  basePath: string;
  params?: Record<string, string | undefined>;
  align?: "right";
}) {
  const active = sort === column;
  const nextDir: SortDir = active && dir === "asc" ? "desc" : "asc";

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v) search.set(k, v);
  }
  search.set("sort", column);
  search.set("dir", nextDir);

  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <Link
      href={`${basePath}?${search.toString()}`}
      aria-label={`Sort by ${label}${active ? ` (${dir === "asc" ? "ascending" : "descending"})` : ""}`}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap hover:text-slate-900",
        align === "right" && "flex-row-reverse"
      )}
    >
      {label}
      <Icon
        className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-slate-400")}
      />
    </Link>
  );
}
