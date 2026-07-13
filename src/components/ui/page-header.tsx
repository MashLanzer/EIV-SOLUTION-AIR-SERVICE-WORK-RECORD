import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// The standard page header used across the app: an optional "back" eyebrow,
// the title, an optional one-line description, and an optional action slot on
// the right (a button, a count, etc). Keeps every page's header rhythm
// identical so screens read as one product.
export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      {backHref && backLabel ? (
        <Link
          href={backHref}
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
