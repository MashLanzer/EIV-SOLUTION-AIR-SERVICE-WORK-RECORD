import { Eye, LogIn, ShieldCheck, UserRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { endSupportSessionAction } from "@/actions/impersonation";
import type { SupportHistoryEntry } from "@/lib/platform";

const KIND_META = {
  full: { icon: LogIn, label: "Full support" },
  read_only: { icon: Eye, label: "Read-only" },
  view_as: { icon: UserRound, label: "Viewed as" },
} as const;

// Human "how long it ran" for a finished session.
function durationLabel(from: Date, to: Date): string {
  const mins = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Accountability trail: every time the platform entered this company, newest
// first. Open sessions are marked live and can be force-ended right here.
export function SupportHistory({ entries }: { entries: SupportHistoryEntry[] }) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <ShieldCheck className="h-4 w-4" />
        Support access history
      </h2>
      <Card>
        <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
          {entries.length === 0 ? (
            <p className="px-4 py-4 text-sm text-neutral-400">No support sessions yet.</p>
          ) : (
            entries.map((e) => {
              const meta = KIND_META[e.kind];
              const Icon = meta.icon;
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-1.5 text-sm text-neutral-900 dark:text-neutral-100">
                        <span className="font-medium">
                          {meta.label}
                          {e.targetName ? ` ${e.targetName}` : ""}
                        </span>
                        {e.active && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success-text">
                            <span className="h-1.5 w-1.5 rounded-full bg-success-text" />
                            Live
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-neutral-400">
                        {e.actorEmail} · {fmt.format(e.startedAt)}
                        {e.endedAt ? ` · ${durationLabel(e.startedAt, e.endedAt)}` : ""}
                      </div>
                    </div>
                  </div>
                  {e.active && (
                    <form action={endSupportSessionAction.bind(null, e.id)} className="shrink-0">
                      <button
                        type="submit"
                        className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      >
                        End now
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </section>
  );
}
