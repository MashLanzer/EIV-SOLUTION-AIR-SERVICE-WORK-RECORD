"use client";

import { useTransition } from "react";
import { FileText, Receipt, UserRound } from "lucide-react";

import { setOrgFeatureAction } from "@/actions/superAdmin";

const FEATURES: { key: "invoicing" | "estimates" | "portal"; label: string; desc: string; icon: typeof Receipt }[] = [
  { key: "invoicing", label: "Invoicing", desc: "Invoices, PDF, public pay links.", icon: Receipt },
  { key: "estimates", label: "Estimates", desc: "Quotes and convert-to-invoice.", icon: FileText },
  { key: "portal", label: "Customer portal", desc: "Private per-customer history link.", icon: UserRound },
];

export function OrgFeatureToggles({
  orgId,
  features,
}: {
  orgId: string;
  features: { invoicing: boolean; estimates: boolean; portal: boolean };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Modules
      </h2>
      <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
        {FEATURES.map(({ key, label, desc, icon: Icon }) => {
          const on = features[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</div>
                  <div className="text-xs text-neutral-400">{desc}</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${label} ${on ? "on" : "off"}`}
                disabled={pending}
                onClick={() => startTransition(() => setOrgFeatureAction(orgId, key, !on))}
                className={
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 " +
                  (on ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-300 dark:bg-neutral-700")
                }
              >
                <span
                  className={
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-neutral-900 " +
                    (on ? "translate-x-[22px]" : "translate-x-0.5")
                  }
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
