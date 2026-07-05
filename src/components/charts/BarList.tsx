import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

export interface BarDatum {
  label: string;
  value: number;
}

// Single-series magnitude chart rendered as a horizontal bar list - reads
// well on narrow phone screens, needs no client JS, and each bar carries a
// direct value label plus a native title tooltip. One hue (brand primary),
// with a recessive track; text stays in ink tokens, per the dataviz rules.
export function BarList({
  data,
  formatValue = (v) => String(v),
  emptyLabel = "No data yet",
  labelWidth = "6.5rem",
}: {
  data: BarDatum[];
  formatValue?: (value: number) => string;
  emptyLabel?: string;
  labelWidth?: string;
}) {
  if (data.length === 0) {
    return (
      <EmptyState icon={BarChart3} title={emptyLabel} description="" />
    );
  }

  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((d) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <li
            key={d.label}
            className="grid items-center gap-3"
            style={{ gridTemplateColumns: `${labelWidth} 1fr auto` }}
          >
            <span className="truncate text-sm text-neutral-600 dark:text-neutral-300" title={d.label}>
              {d.label}
            </span>
            <span
              className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800"
              role="img"
              aria-label={`${d.label}: ${formatValue(d.value)}`}
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${Math.max(pct, d.value > 0 ? 4 : 0)}%` }}
                title={`${d.label}: ${formatValue(d.value)}`}
              />
            </span>
            <span className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatValue(d.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
