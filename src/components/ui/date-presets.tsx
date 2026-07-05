"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";

// Quick date-range buttons that fill the From/To date inputs of the
// surrounding filter form and submit it. Dates are computed at click time
// in the browser's local calendar (matching the plain date inputs).
function iso(d: Date) {
  const t = new Date(d);
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  return t.toISOString().slice(0, 10);
}

export function DatePresets({
  fromId = "dateFrom",
  toId = "dateTo",
}: {
  fromId?: string;
  toId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function apply(from: string, to: string) {
    const fromEl = document.getElementById(fromId);
    const toEl = document.getElementById(toId);
    if (fromEl instanceof HTMLInputElement) fromEl.value = from;
    if (toEl instanceof HTMLInputElement) toEl.value = to;
    ref.current?.closest("form")?.requestSubmit();
  }

  const presets: { label: string; range: () => [string, string] }[] = [
    {
      label: "This week",
      range: () => {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        return [iso(monday), iso(now)];
      },
    },
    {
      label: "This month",
      range: () => {
        const now = new Date();
        return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
      },
    },
    {
      label: "Last 30 days",
      range: () => {
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 29);
        return [iso(start), iso(now)];
      },
    },
    {
      label: "This quarter",
      range: () => {
        const now = new Date();
        const qStart = new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1
        );
        return [iso(qStart), iso(now)];
      },
    },
    { label: "All time", range: () => ["", ""] },
  ];

  return (
    <div ref={ref} className="flex flex-wrap gap-2">
      {presets.map((p) => (
        <Button
          key={p.label}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const [from, to] = p.range();
            apply(from, to);
          }}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
