// A dependency-free, monochrome vertical bar chart matching the app's house
// style (same approach as the pay-report chart). Bars scale to the series max;
// an all-zero series renders flat.
export function MiniBarChart({
  title,
  bars,
}: {
  title: string;
  bars: { label: string; value: number; display: string }[];
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </h3>
      <div className="flex items-end justify-between gap-2" style={{ height: "8rem" }}>
        {bars.map((b, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">
              {b.display}
            </span>
            <div
              className="w-full max-w-[2.5rem] rounded-t bg-neutral-800 transition-all dark:bg-neutral-200"
              style={{ height: `${Math.max(2, (b.value / max) * 100)}%` }}
              title={`${b.label}: ${b.display}`}
            />
            <span className="truncate text-[10px] text-neutral-400">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
