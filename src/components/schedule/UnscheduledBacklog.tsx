import Link from "next/link";
import { CalendarPlus, FolderClock } from "lucide-react";

import { getT } from "@/lib/i18n/server";

type BacklogProject = {
  id: string;
  name: string;
  customer: { name: string } | null;
};

type SchedT = Awaited<ReturnType<typeof getT>>["schedule"];

// A "needs scheduling" nudge on the month view: active projects with no
// upcoming visit, each linking straight into the new-job sheet pre-pointed at
// that project (?new=1&newProject=<id>, carrying the current view + date so the
// job lands on the day being viewed). Collapsed by default so it stays a hint,
// not a second list; renders nothing when the backlog is empty.
export function UnscheduledBacklog({
  projects,
  scheduleHref,
  t,
}: {
  projects: BacklogProject[];
  // Builds the new-job link for one project id.
  scheduleHref: (projectId: string) => string;
  t: SchedT;
}) {
  if (projects.length === 0) return null;

  return (
    <details className="group animate-fade-up rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <FolderClock className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {t.backlogTitle}
            </span>
            <span className="rounded-full bg-neutral-900 px-1.5 text-xs font-semibold tabular-nums text-white dark:bg-neutral-100 dark:text-neutral-900">
              {projects.length}
            </span>
          </span>
          <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
            {t.backlogHint}
          </span>
        </span>
        <span className="text-neutral-400 transition-transform group-open:rotate-90 dark:text-neutral-500">
          ›
        </span>
      </summary>
      <ul className="flex flex-col border-t border-neutral-100 dark:border-neutral-800">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 last:border-b-0 dark:border-neutral-800"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-neutral-900 dark:text-neutral-100">
                {p.name}
              </span>
              {p.customer && (
                <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {p.customer.name}
                </span>
              )}
            </span>
            <Link
              href={scheduleHref(p.id)}
              scroll={false}
              aria-label={t.backlogForProject.replace("{project}", p.name)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              {t.backlogSchedule}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
