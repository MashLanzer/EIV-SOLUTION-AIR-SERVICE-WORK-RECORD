"use client";

import { useTransition } from "react";
import type { Plan } from "@prisma/client";

import { setOrgPlanAction } from "@/actions/superAdmin";
import { PLANS, PLAN_KEYS } from "@/lib/plans";
import { cn } from "@/lib/utils";

// Assign a plan from the console. Selecting a plan also applies that plan's
// module entitlements (see setOrgPlanAction).
export function OrgPlanSelect({ orgId, current }: { orgId: string; current: Plan | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Plan
      </h2>
      {current === null && (
        <p className="text-xs text-neutral-400">
          Legacy company (no plan limits). Pick a plan to apply its modules and user cap.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {PLAN_KEYS.map((key) => {
          const def = PLANS[key];
          const active = current === key;
          return (
            <button
              key={key}
              type="button"
              disabled={pending || active}
              onClick={() => startTransition(() => setOrgPlanAction(orgId, key))}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors disabled:cursor-default",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              )}
            >
              <span className="flex w-full items-center justify-between text-sm font-semibold">
                {def.name}
                {active && <span className="text-[10px] uppercase opacity-70">Current</span>}
              </span>
              <span className="text-xs opacity-70">
                {def.priceMonthly > 0 ? `$${def.priceMonthly}/mo` : "Free"} ·{" "}
                {def.maxUsers === null ? "∞ users" : `${def.maxUsers} users`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
