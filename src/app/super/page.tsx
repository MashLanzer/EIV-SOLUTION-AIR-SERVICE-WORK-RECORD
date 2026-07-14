import Link from "next/link";
import { Building2, ClipboardList, Eye, LifeBuoy, Receipt, TrendingUp, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { AnnouncementControls } from "@/components/super/AnnouncementControls";
import { endSupportSessionAction } from "@/actions/impersonation";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getOrgSummaries, getPlatformOverview } from "@/lib/platform";
import { getActiveSupportSessions } from "@/lib/support";
import { getActiveAnnouncement } from "@/lib/announcements";

export const dynamic = "force-dynamic";

export default async function SuperOverviewPage() {
  await requireSuperAdmin();
  const [o, orgs, support, announcement] = await Promise.all([
    getPlatformOverview(),
    getOrgSummaries(),
    getActiveSupportSessions(),
    getActiveAnnouncement(),
  ]);

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const recent = orgs.slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Platform overview</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Every company using AeroTrack, at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Building2} value={String(o.organizations)} label="Companies" />
        <StatTile icon={Users} value={String(o.users)} label="Users" />
        <StatTile icon={ClipboardList} value={String(o.records)} label="Work records" />
        <StatTile icon={Receipt} value={String(o.invoices)} label="Invoices" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={TrendingUp} value={`+${o.newOrgs}`} label="New companies (30d)" />
        <StatTile icon={TrendingUp} value={`+${o.newRecords}`} label="New records (30d)" />
        <StatTile icon={Receipt} value={String(o.paidInvoices)} label="Paid invoices" />
      </div>

      <AnnouncementControls current={announcement?.message ?? null} />

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

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Newest companies
          </h2>
          <Link href="/super/orgs" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <Card>
          <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
            {recent.map((org) => (
              <Link
                key={org.id}
                href={`/super/orgs/${org.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {org.name}
                    </span>
                    {!org.active && (
                      <span className="rounded-full bg-destructive-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive-text">
                        Suspended
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-400">{dateFmt.format(org.createdAt)}</span>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  <span>{org.users} users</span>
                  <span>{org.records} records</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
