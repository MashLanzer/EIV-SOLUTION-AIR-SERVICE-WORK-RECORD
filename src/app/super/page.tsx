import Link from "next/link";
import { Activity, BellRing, Building2, Check, ClipboardList, Eye, LifeBuoy, Receipt, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { AttentionPanel } from "@/components/super/AttentionPanel";
import { SnoozeButton } from "@/components/super/SnoozeButton";
import { endSupportSessionAction } from "@/actions/impersonation";
import { completeOrgReminderAction } from "@/actions/orgReminders";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getDueReminders, getPlatformAttention, getPlatformFeed, getPlatformOverview } from "@/lib/platform";
import { getActiveSupportSessions } from "@/lib/support";

export const dynamic = "force-dynamic";

export default async function SuperOverviewPage() {
  await requireSuperAdmin();
  const [o, support, attention, feed, dueReminders] = await Promise.all([
    getPlatformOverview(),
    getActiveSupportSessions(),
    getPlatformAttention(),
    getPlatformFeed(5),
    getDueReminders(),
  ]);

  const timeFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const dueFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Platform overview</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Every company using AeroTrack, at a glance.
        </p>
      </div>

      {/* One compact KPI row: the 30-day growth folds into each headline tile
          as a sub-line + delta. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={Building2}
          value={String(o.organizations)}
          label="Companies"
          sub={`+${o.newOrgs} in 30d`}
          delta={<DeltaBadge current={o.newOrgs} previous={o.prevNewOrgs} />}
        />
        <StatTile
          icon={ClipboardList}
          value={String(o.records)}
          label="Work records"
          sub={`+${o.newRecords} in 30d`}
          delta={<DeltaBadge current={o.newRecords} previous={o.prevNewRecords} />}
        />
        <StatTile icon={Users} value={String(o.users)} label="Users" />
        <StatTile icon={Receipt} value={String(o.invoices)} label="Invoices" sub={`${o.paidInvoices} paid`} />
      </div>

      <AttentionPanel attention={attention} />

      {dueReminders.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <BellRing className="h-4 w-4" />
            Follow-ups due ({dueReminders.length})
          </h2>
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
              {dueReminders.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-900 dark:text-neutral-100">{r.note}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                      <Link
                        href={`/super/orgs/${r.orgId}`}
                        className="truncate font-medium text-neutral-600 hover:text-primary dark:text-neutral-300"
                      >
                        {r.orgName}
                      </Link>
                      <span className={r.overdue ? "font-medium text-destructive-text" : "text-neutral-400"}>
                        · {r.overdue ? "Overdue" : "Due"} {dueFmt.format(r.dueAt)}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <SnoozeButton reminderId={r.id} />
                    <form action={completeOrgReminderAction.bind(null, r.id)}>
                      <Button type="submit" size="sm" variant="ghost" aria-label="Mark done">
                        <Check className="h-4 w-4" />
                        Done
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {support.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            <LifeBuoy className="h-4 w-4" />
            Active support sessions ({support.length})
          </h2>
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
              {support.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/super/orgs/${s.organizationId}`}
                        className="truncate font-medium text-neutral-900 hover:text-primary dark:text-neutral-100"
                      >
                        {s.organizationName}
                      </Link>
                      {s.readOnly && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          <Eye className="h-3 w-3" />
                          View only
                        </span>
                      )}
                    </div>
                    <span className="truncate text-xs text-neutral-400">
                      {s.actorEmail} · until{" "}
                      {s.expiresAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                  <form action={endSupportSessionAction.bind(null, s.id)}>
                    <Button type="submit" size="sm" variant="ghost" className="text-destructive-text">
                      End
                    </Button>
                  </form>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Compact preview of the platform pulse; the full feed lives in Activity. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <Activity className="h-4 w-4" />
            Recent activity
          </h2>
          <Link href="/super/activity" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <Card>
          <CardContent className="stagger-children flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
            {feed.length === 0 ? (
              <p className="px-4 py-4 text-sm text-neutral-400">Nothing yet.</p>
            ) : (
              feed.map((item) => {
                const title = item.kind === "signup" ? `${item.orgName} signed up` : item.summary;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      {item.orgId ? (
                        <Link
                          href={`/super/orgs/${item.orgId}`}
                          className="block truncate text-sm text-neutral-900 hover:text-primary dark:text-neutral-100"
                        >
                          {title}
                        </Link>
                      ) : (
                        <span className="block truncate text-sm text-neutral-900 dark:text-neutral-100">
                          {title}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-400">
                      {timeFmt.format(item.date)}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
