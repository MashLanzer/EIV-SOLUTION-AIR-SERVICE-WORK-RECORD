import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Icon-box tones. Default is the neutral monochrome box; success/warning are
// reserved for semantic emphasis (e.g. approved counts, things needing action).
const TONES = {
  default: "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
} as const;

export type StatTileTone = keyof typeof TONES;

// The one metric tile used across the app (dashboard, workers, profile, team
// detail, worker home, schedule summary). Optional icon (top-left in a small
// box), the figure, its label, an optional sub-line, and an optional href that
// turns the whole tile into a link with a trailing arrow.
export function StatTile({
  icon: Icon,
  value,
  label,
  sub,
  href,
  tone = "default",
  center = false,
}: {
  icon?: LucideIcon;
  value: string | number;
  label: string;
  sub?: string;
  href?: string;
  tone?: StatTileTone;
  // Center the content and let the text wrap instead of truncating — for tiles
  // whose value can be long text (e.g. a worker name), so nothing gets cut off.
  center?: boolean;
}) {
  // When centered, the value can be free text (a name), so scale it down a touch
  // and let it wrap; the truncating default stays for numeric tiles.
  const textFlow = center ? "break-words" : "truncate";
  const inner = (
    <CardContent className={cn("flex h-full flex-col gap-2 p-3", center && "items-center text-center")}>
      {Icon ? (
        <div className="flex w-full items-center justify-between">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              TONES[tone]
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          {href ? (
            <ArrowRight className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
          ) : null}
        </div>
      ) : null}
      <div className="min-w-0 w-full">
        <div
          className={cn(
            "font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100",
            center ? "text-base leading-tight" : "text-xl",
            textFlow
          )}
        >
          {value}
        </div>
        <div className={cn("text-xs text-neutral-500 dark:text-neutral-400", textFlow)}>{label}</div>
        {sub ? (
          <div className={cn("text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400", textFlow)}>
            {sub}
          </div>
        ) : null}
      </div>
    </CardContent>
  );

  const card = (
    <Card
      className={cn(
        "h-full",
        href && "transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
      )}
    >
      {inner}
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
