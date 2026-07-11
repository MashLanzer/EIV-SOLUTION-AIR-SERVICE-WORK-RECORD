import { teamColor } from "@/lib/teamColors";
import { cn } from "@/lib/utils";

// A small solid swatch for a team's color, used inline next to the team name
// in lists and headers. Pass the stored color key (nullable) plus a stable
// seed (the team id) so a team without a saved color still gets a consistent
// fallback swatch.
export function TeamColorDot({
  color,
  seed,
  className,
}: {
  color: string | null | undefined;
  seed: string;
  className?: string;
}) {
  const c = teamColor(color, seed);
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", c.dot, className)}
    />
  );
}

// A colored circle with the team's initial, used as the leading chip on team
// list rows and the detail header (gives crews a visual identity).
export function TeamAvatar({
  name,
  color,
  seed,
  className,
}: {
  name: string;
  color: string | null | undefined;
  seed: string;
  className?: string;
}) {
  const c = teamColor(color, seed);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        c.chip,
        className
      )}
    >
      {initial}
    </span>
  );
}

// A soft pill showing the team's color + name, used on project cards to signal
// crew ownership at a glance.
export function TeamChip({
  name,
  color,
  seed,
  className,
}: {
  name: string;
  color: string | null | undefined;
  seed: string;
  className?: string;
}) {
  const c = teamColor(color, seed);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        c.chip,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} aria-hidden="true" />
      {name}
    </span>
  );
}
