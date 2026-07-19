import { cn } from "@/lib/utils";

// A period-over-period delta indicator: ▲ green (up) / ▼ red (down) / — muted
// (unchanged), matching the profile's "this month vs last" strip. Reused on any
// KPI that has a comparable previous-period value.
//
// `goodWhenUp=false` flips the colour for metrics where a rise is bad — money
// outstanding, wait times, etc. — so red always means "worse".
export function DeltaBadge({
  current,
  previous,
  format = (n: number) => String(n),
  goodWhenUp = true,
  className,
}: {
  current: number;
  previous: number;
  // Format the (absolute) delta for display — e.g. money or a percent suffix.
  format?: (n: number) => string;
  goodWhenUp?: boolean;
  className?: string;
}) {
  const delta = current - previous;
  // Treat a negligible change as flat (covers both integer counts and money).
  if (Math.abs(delta) < 0.005) {
    return (
      <span
        aria-hidden="true"
        className={cn("text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400", className)}
      >
        —
      </span>
    );
  }
  const up = delta > 0;
  const good = up === goodWhenUp;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        good ? "text-success-text" : "text-destructive-text",
        className
      )}
    >
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {format(Math.abs(delta))}
    </span>
  );
}
