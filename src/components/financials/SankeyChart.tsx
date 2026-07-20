import { Card, CardContent } from "@/components/ui/card";
import type { FlowKey } from "@/lib/sankey";

// Distinct, muted hues per money bucket. The revenue source bar is neutral.
const COLOR: Record<FlowKey, string> = {
  labor: "#f59e0b",
  materials: "#3b82f6",
  expenses: "#a855f7",
  profit: "#10b981",
};
const SOURCE_COLOR = "#71717a";

export interface SankeySegment {
  key: FlowKey;
  label: string;
  amount: string; // formatted
  sharePct: number;
  share: number; // 0-1
}

// Revenue → cost buckets + profit, drawn as proportional ribbons (pure SVG, no
// chart lib). A legend below maps each colored flow to its label and amount, so
// no text lives inside the non-uniformly scaled canvas.
export function SankeyChart({
  heading,
  revenueLabel,
  revenueAmount,
  segments,
  loss,
  lossLabel,
}: {
  heading: string;
  revenueLabel: string;
  revenueAmount: string;
  segments: SankeySegment[];
  loss: boolean;
  lossLabel: string;
}) {
  if (segments.length === 0) return null;

  const W = 100;
  const H = 100;
  const nodeW = 4;
  const x0 = nodeW; // right edge of the source bar
  const x1 = W - nodeW; // left edge of the target bars
  const mx = (x0 + x1) / 2;

  const n = segments.length;
  const gap = 1.6;
  const totalGap = gap * Math.max(0, n - 1);
  const usable = H - totalGap;

  // Ribbon heights, then prefix offsets computed functionally (no render-time
  // mutation). The source stack is contiguous and centered against the gapped
  // target column, so both sides span the same range.
  const heights = segments.map((s) => s.share * usable);
  const sumBefore = (i: number) => heights.slice(0, i).reduce((a, b) => a + b, 0);
  const ribbons = segments.map((s, i) => {
    const h = heights[i];
    const y0L = totalGap / 2 + sumBefore(i);
    const y1L = y0L + h;
    const y0R = sumBefore(i) + gap * i;
    const y1R = y0R + h;
    const path = `M ${x0} ${y0L} C ${mx} ${y0L}, ${mx} ${y0R}, ${x1} ${y0R} L ${x1} ${y1R} C ${mx} ${y1R}, ${mx} ${y1L}, ${x0} ${y1L} Z`;
    return { key: s.key, path, y0R, h, color: COLOR[s.key] };
  });

  const sourceTop = totalGap / 2;
  const sourceH = usable;

  return (
    <Card className="animate-fade-up">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {heading}
          </span>
          {loss && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {lossLabel}
            </span>
          )}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-52 w-full"
          role="img"
          aria-label={heading}
        >
          {/* Ribbons */}
          {ribbons.map((r) => (
            <path key={r.key} d={r.path} fill={r.color} opacity={0.4} />
          ))}
          {/* Source (revenue) bar */}
          <rect x={0} y={sourceTop} width={nodeW} height={sourceH} rx={0.8} fill={SOURCE_COLOR} />
          {/* Target bars */}
          {ribbons.map((r) => (
            <rect
              key={r.key}
              x={W - nodeW}
              y={r.y0R}
              width={nodeW}
              height={r.h}
              rx={0.8}
              fill={r.color}
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SOURCE_COLOR }} />
              <span className="font-medium text-neutral-700 dark:text-neutral-200">
                {revenueLabel}
              </span>
            </span>
            <span className="tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
              {revenueAmount}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 border-t border-neutral-200 pt-1.5 dark:border-neutral-800 sm:grid-cols-2">
            {segments.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: COLOR[s.key] }}
                  />
                  <span className="truncate text-neutral-600 dark:text-neutral-300">{s.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-neutral-700 dark:text-neutral-200">
                  {s.amount}
                  <span className="ml-1 text-neutral-400 dark:text-neutral-500">{s.sharePct}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
