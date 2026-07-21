"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Flag, FlagOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { bulkUpdateOrgsAction, type BulkOp } from "@/actions/orgBulk";

// Floating bar for the Companies list: pick several rows (checkbox name
// "orgids") and apply a quick action — flag/unflag to watch, or move to a plan —
// without opening each company. Reads the checked boxes from the DOM so the list
// itself stays server-rendered.
export function OrgBulkBar() {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function recompute() {
      const checked = Array.from(
        document.querySelectorAll<HTMLInputElement>('input[name="orgids"]:checked')
      ).map((i) => i.value);
      setSelected(checked);
    }
    document.addEventListener("change", recompute);
    recompute();
    return () => document.removeEventListener("change", recompute);
  }, []);

  function clearChecks() {
    document
      .querySelectorAll<HTMLInputElement>('input[name="orgids"], input[data-select-all-orgs]')
      .forEach((c) => {
        c.checked = false;
      });
    setSelected([]);
  }

  function run(op: BulkOp) {
    const ids = [...selected];
    startTransition(async () => {
      await bulkUpdateOrgsAction(ids, op);
      clearChecks();
    });
  }

  const count = selected.length;
  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-4 sm:bottom-6">
      <div
        ref={barRef}
        className="animate-fade-up pointer-events-auto mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-lg shadow-black/10 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95"
      >
        <button
          type="button"
          onClick={clearChecks}
          aria-label="Clear selection"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
          {count} selected
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run("watch")}>
            <Flag className="h-4 w-4" />
            Watch
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => run("unwatch")}>
            <FlagOff className="h-4 w-4" />
            Unwatch
          </Button>
          <ConfirmDialog
            title={`Move ${count} ${count === 1 ? "company" : "companies"} to Free?`}
            description="This sets the plan and applies the Free plan's module entitlements. You can fine-tune modules afterward."
            confirmLabel="Set to Free"
            confirmVariant="default"
            onConfirm={() => run("plan:FREE")}
            trigger={
              <Button type="button" variant="outline" size="sm" disabled={pending}>
                Set Free
              </Button>
            }
          />
          <ConfirmDialog
            title={`Move ${count} ${count === 1 ? "company" : "companies"} to Pro?`}
            description="This sets the plan and applies the Pro plan's module entitlements. You can fine-tune modules afterward."
            confirmLabel="Set to Pro"
            confirmVariant="default"
            onConfirm={() => run("plan:PRO")}
            trigger={
              <Button type="button" size="sm" disabled={pending}>
                Set Pro
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
