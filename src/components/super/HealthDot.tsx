import { cn } from "@/lib/utils";
import type { Health, HealthTier } from "@/lib/health";

const DOT: Record<HealthTier, string> = {
  healthy: "bg-success-text",
  fair: "bg-warning-text",
  at_risk: "bg-destructive-text",
  suspended: "bg-neutral-400 dark:bg-neutral-500",
};

// A compact traffic-light for a company's consolidated health. `withLabel`
// shows the tier text (used on the detail page); the bare dot is for list rows.
export function HealthDot({
  health,
  withLabel = false,
  className,
}: {
  health: Health;
  withLabel?: boolean;
  className?: string;
}) {
  if (!withLabel) {
    return (
      <span
        className={cn("inline-block h-2 w-2 shrink-0 rounded-full", DOT[health.tier], className)}
        aria-label={`Health: ${health.label}`}
        title={`Health: ${health.label} (${health.score}/100)`}
      />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200",
        className
      )}
      title={`${health.score}/100`}
    >
      <span className={cn("h-2.5 w-2.5 rounded-full", DOT[health.tier])} />
      {health.label}
    </span>
  );
}
