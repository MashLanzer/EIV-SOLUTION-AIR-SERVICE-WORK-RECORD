import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ForecastPoint } from "@/lib/forecast";
import { cn } from "@/lib/utils";

// A compact revenue forecast: the recent history as a solid line, the projected
// months as a dashed line inside a shaded confidence band. Pure SVG (no lib),
// theme-aware via currentColor + tokens.
export function ForecastChart({
  heading,
  history,
  points,
  monthLabels,
  nextLabel,
  nextValue,
  rangeLabel,
  confidenceLabel,
  slope,
}: {
  heading: string;
  history: number[];
  points: ForecastPoint[];
  monthLabels: string[]; // one per x position (history + forecast)
  nextLabel: string;
  nextValue: string;
  rangeLabel: string; // e.g. "$3,200 – $5,100"
  confidenceLabel: string;
  slope: number;
}) {
  const n = history.length;
  const total = n + points.length;
  if (n < 2 || total < 2) return null;

  const highs = points.map((p) => p.high);
  const yMax = Math.max(1, ...history, ...highs);
  const W = 100;
  const H = 100;
  const x = (i: number) => (total === 1 ? 0 : (i / (total - 1)) * W);
  const y = (v: number) => H - (v / yMax) * H;

  const histLine = history.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const joinX = x(n - 1);
  const joinY = y(history[n - 1]);
  const foreLine = [`${joinX},${joinY}`, ...points.map((p, k) => `${x(n + k)},${y(p.value)}`)].join(" ");

  // Band polygon: along the highs out, then back along the lows.
  const bandTop = [`${joinX},${joinY}`, ...points.map((p, k) => `${x(n + k)},${y(p.high)}`)];
  const bandBottom = [...points.map((p, k) => `${x(n + k)},${y(p.low)}`).reverse(), `${joinX},${joinY}`];
  const band = [...bandTop, ...bandBottom].join(" ");

  const up = slope >= 0;

  return (
    <Card className="animate-fade-up">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {heading}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {confidenceLabel}
          </span>
        </div>

        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{nextLabel}</p>
          <p className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {nextValue}
          </p>
          <p className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">{rangeLabel}</p>
        </div>

        <div className="text-accent">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-24 w-full overflow-visible"
            role="img"
            aria-label={heading}
          >
            {/* Confidence band */}
            <polygon points={band} fill="currentColor" opacity={0.14} />
            {/* Divider between history and forecast */}
            <line
              x1={joinX}
              y1={0}
              x2={joinX}
              y2={H}
              stroke="currentColor"
              strokeWidth={0.5}
              strokeDasharray="2 2"
              opacity={0.25}
              vectorEffect="non-scaling-stroke"
            />
            {/* History line */}
            <polyline
              points={histLine}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className="text-neutral-500 dark:text-neutral-400"
            />
            {/* Forecast line (dashed) */}
            <polyline
              points={foreLine}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeDasharray="3 3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* First + last month labels bracket the timeline. */}
        <div className="flex justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
          <span>{monthLabels[0]}</span>
          <span>{monthLabels[monthLabels.length - 1]}</span>
        </div>
      </CardContent>
    </Card>
  );
}
