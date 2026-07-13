"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";

import { setProjectStatusAction } from "@/actions/projects";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { PROJECT_STATUSES } from "@/lib/validations";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// A compact status control: shows the current ProjectStatusBadge and, on tap,
// drops a small menu to switch between Active / On hold / Completed. Used on
// the project cards and the detail header. Optimistic so the badge flips
// immediately; the server revalidation then confirms it.
export function ProjectStatusMenu({
  projectId,
  status,
  className,
  align = "end",
}: {
  projectId: string;
  status: ProjectStatus;
  className?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<ProjectStatus>(status);
  const ref = useRef<HTMLDivElement>(null);
  const t = useT().projects;
  const statusLabel: Record<ProjectStatus, string> = {
    ACTIVE: t.statusActive,
    ON_HOLD: t.statusOnHold,
    COMPLETED: t.statusCompleted,
  };

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: ProjectStatus) {
    setOpen(false);
    if (next === optimistic) return;
    startTransition(async () => {
      setOptimistic(next);
      await setProjectStatusAction(projectId, next);
    });
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.changeStatus}
        className="inline-flex items-center gap-1 rounded-full transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        <ProjectStatusBadge status={optimistic} />
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-30 mt-1 w-40 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {PROJECT_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitem"
              onClick={() => pick(s)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {statusLabel[s]}
              {s === optimistic && <Check className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
