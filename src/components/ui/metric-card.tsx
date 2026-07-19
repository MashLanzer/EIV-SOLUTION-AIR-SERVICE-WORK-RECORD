import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

// A grouped overview card: a small cluster label over a row of centred metric
// figures divided by hairlines. Shared by the admin dashboard and the
// Financials summary so the two screens read as one system. The whole card can
// be a link (`href`), or hold individually-linked metrics (`clickable` shows
// the affordance arrow without wrapping the card in a link).
const CARD =
  "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";
const LABEL =
  "text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";

export function MetricCard({
  label,
  href,
  clickable,
  cols = "grid-cols-3",
  children,
}: {
  label: string;
  href?: string;
  clickable?: boolean;
  cols?: string;
  children: React.ReactNode;
}) {
  const showArrow = Boolean(href) || clickable;
  const inner = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <span className={LABEL}>{label}</span>
        {showArrow && (
          <ArrowRight className="h-3.5 w-3.5 text-neutral-500 transition-transform group-hover:translate-x-0.5 dark:text-neutral-400" />
        )}
      </div>
      <div className={cn("grid divide-x divide-neutral-100 dark:divide-neutral-800", cols)}>{children}</div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(CARD, "group transition-colors hover:border-neutral-300 dark:hover:border-neutral-700")}
      >
        {inner}
      </Link>
    );
  }
  return <div className={CARD}>{inner}</div>;
}

// A single centred figure with its caption. Monochrome for cross-screen
// consistency; wrap in MetricLink when the figure should deep-link. An optional
// `delta` (e.g. <DeltaBadge/>) shows a period-over-period trend under the label.
export function Metric({
  value,
  label,
  delta,
}: {
  value: number | string;
  label: string;
  delta?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-2 text-center">
      <div className="max-w-full truncate text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      <div className="mt-1 text-xs leading-tight text-neutral-500 dark:text-neutral-400">{label}</div>
      {delta ? <div className="mt-1 flex justify-center">{delta}</div> : null}
    </div>
  );
}

export function MetricLink({
  value,
  label,
  href,
}: {
  value: number | string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col items-center px-2 text-center transition-opacity hover:opacity-70"
    >
      <div className="max-w-full truncate text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      <div className="mt-1 text-xs leading-tight text-neutral-500 dark:text-neutral-400">{label}</div>
    </Link>
  );
}
