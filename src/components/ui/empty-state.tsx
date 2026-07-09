import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-10 text-center",
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <p className="font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
      {description && <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
      {action}
    </div>
  );
}
