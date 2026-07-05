import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

// Server component: renders prev/next links that preserve the current
// filter params. Hidden entirely when everything fits on one page.
export function Pagination({
  page,
  pageCount,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const linkClass =
    "inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800";
  const disabledClass =
    "pointer-events-none border-neutral-200 dark:border-neutral-800 text-neutral-300 dark:text-neutral-600";

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3"
    >
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        className={cn(linkClass, page <= 1 && disabledClass)}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Link>
      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        Page {page} of {pageCount}
      </span>
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={page >= pageCount}
        className={cn(linkClass, page >= pageCount && disabledClass)}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
