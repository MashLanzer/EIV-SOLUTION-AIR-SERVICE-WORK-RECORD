import Link from "next/link";
import { AlertTriangle, Clock, PauseCircle, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { AttentionOrg, PlatformAttention } from "@/lib/platform";

// Actionable signals for the owner: companies that likely need a nudge. Only
// non-empty groups render; if everything's healthy the whole panel is hidden.
export function AttentionPanel({ attention }: { attention: PlatformAttention }) {
  const groups: { key: string; icon: LucideIcon; label: string; items: AttentionOrg[] }[] = [
    { key: "inactive", icon: Clock, label: "Inactive 30+ days", items: attention.inactive },
    { key: "never", icon: AlertTriangle, label: "Signed up, no records", items: attention.neverActivated },
    { key: "suspended", icon: PauseCircle, label: "Suspended", items: attention.suspended },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <AlertTriangle className="h-4 w-4 text-warning-text" />
        Needs attention
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {groups.map(({ key, icon: Icon, label, items }) => (
          <Card key={key}>
            <CardContent className="flex flex-col gap-2.5 p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-text">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-lg font-semibold tabular-nums leading-none text-neutral-900 dark:text-neutral-100">
                    {items.length}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
                </div>
              </div>
              <ul className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/super/orgs/${o.id}`}
                      className="block truncate rounded px-1 py-0.5 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                    >
                      {o.name}
                    </Link>
                  </li>
                ))}
                {items.length > 3 && (
                  <li className="px-1 pt-0.5 text-xs text-neutral-400">
                    +{items.length - 3} more
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
