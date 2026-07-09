import * as React from "react";

import { cn } from "@/lib/utils";

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-11 w-full appearance-none rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 bg-[length:1rem] bg-[position:right_0.75rem_center] bg-no-repeat bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2216%22%20height=%2216%22%20fill=%22none%22%20viewBox=%220%200%2016%2016%22%3E%3Cpath%20stroke=%22%23737373%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20stroke-width=%221.5%22%20d=%22m4%206%204%204%204-4%22/%3E%3C/svg%3E')] px-3 py-2 pr-9 text-base transition-colors hover:border-neutral-400 dark:hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive sm:text-sm",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Select };
