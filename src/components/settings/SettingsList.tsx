import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

// iOS-style grouped settings. A Section is an eyebrow + a single rounded card
// whose rows are separated by hairlines; a Row is [icon] [label/sublabel]
// [trailing control or value], optionally the whole row is a link with a
// chevron. Kept deliberately generic so every settings group reads the same.

export function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-2", className)}>
      {title && (
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 divide-y divide-neutral-200 dark:divide-neutral-800">
        {children}
      </div>
      {description && (
        <p className="px-1 text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      )}
    </section>
  );
}

function RowInner({
  icon: Icon,
  label,
  sublabel,
  trailing,
  destructive,
  hasChevron,
}: {
  icon?: LucideIcon;
  label: ReactNode;
  sublabel?: ReactNode;
  trailing?: ReactNode;
  destructive?: boolean;
  hasChevron?: boolean;
}) {
  return (
    <>
      {Icon && (
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            destructive
              ? "bg-destructive-soft text-destructive-text"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-sm font-medium",
            destructive
              ? "text-destructive-text"
              : "text-neutral-900 dark:text-neutral-100"
          )}
        >
          {label}
        </span>
        {sublabel && (
          <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {sublabel}
          </span>
        )}
      </div>
      {trailing != null && (
        <div className="flex shrink-0 items-center text-sm text-neutral-500 dark:text-neutral-400">
          {trailing}
        </div>
      )}
      {hasChevron && (
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
      )}
    </>
  );
}

// A row. If `href` is given, the whole row is a tappable link (with chevron).
// Otherwise it's a static row that can carry a trailing control (Switch, etc.).
export function SettingsRow({
  icon,
  label,
  sublabel,
  trailing,
  href,
  external,
  destructive,
  onClick,
}: {
  icon?: LucideIcon;
  label: ReactNode;
  sublabel?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  external?: boolean;
  destructive?: boolean;
  // Makes the row a plain clickable button (used for the tap-to-reveal Role
  // row). Ignored when `href` is set.
  onClick?: () => void;
}) {
  const inner = (
    <RowInner
      icon={icon}
      label={label}
      sublabel={sublabel}
      trailing={trailing}
      destructive={destructive}
      hasChevron={Boolean(href)}
    />
  );
  const base = "flex w-full items-center gap-3 px-4 py-3 text-left";
  const tap =
    "transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900 active:bg-neutral-100 dark:active:bg-neutral-800";
  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer" className={cn(base, tap)}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={cn(base, tap)}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, tap)}>
        {inner}
      </button>
    );
  }
  return <div className={cn(base)}>{inner}</div>;
}

// A row whose content is fully custom (e.g. a form or a segmented control
// stacked under a label). Keeps the hairline separation + padding.
export function SettingsCustomRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-4 py-3", className)}>{children}</div>;
}
