"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TabPanel {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
}

// A segmented tab strip with a single active panel. Panels are rendered on the
// server and passed in as `content`, so switching tabs is instant and never
// refetches. Reusable across sections (project detail today, more later).
export function Tabs({ tabs, className }: { tabs: TabPanel[]; className?: string }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === current?.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs tabular-nums",
                    isActive
                      ? "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                      : "text-neutral-400 dark:text-neutral-500"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
