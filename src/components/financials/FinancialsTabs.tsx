"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FinancialsPanel {
  key: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
}

// An in-page segmented control that swaps between groups of Financials cards,
// so the dashboard reads as a few short screens instead of one long scroll.
// Content is server-rendered and passed in; switching is instant (client
// state, no refetch). Same pill look as the section/profile tabs.
export function FinancialsTabs({
  panels,
  ariaLabel,
}: {
  panels: FinancialsPanel[];
  ariaLabel?: string;
}) {
  const [active, setActive] = useState(panels[0]?.key);
  const current = panels.find((p) => p.key === active) ?? panels[0];
  if (!current) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          role="tablist"
          aria-label={ariaLabel}
          className="inline-flex gap-1 rounded-lg border border-neutral-200 bg-neutral-100/60 p-1 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {panels.map((p) => {
            const isActive = p.key === current.key;
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(p.key)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                )}
              >
                {p.icon}
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
      <div key={current.key} role="tabpanel" className="flex animate-fade-up flex-col gap-4">
        {current.content}
      </div>
    </div>
  );
}
