import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, Building2, ClipboardList, DollarSign, FolderKanban, Receipt, Users } from "lucide-react";

import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { OrgFeatureToggles } from "@/components/super/OrgFeatureToggles";
import { OrgPlanSelect } from "@/components/super/OrgPlanSelect";
import { InviteAdminForm } from "@/components/super/InviteAdminForm";
import { OrgLifecycleControls } from "@/components/super/OrgLifecycleControls";
import { OrgManageSheet } from "@/components/super/OrgManageSheet";
import { OrgMessageSheet } from "@/components/super/OrgMessageSheet";
import { EnterSupportButton } from "@/components/super/EnterSupportButton";
import { ViewAsUserButton } from "@/components/super/ViewAsUserButton";
import { OrgNotesPanel } from "@/components/super/OrgNotesPanel";
import { planLabel } from "@/lib/plans";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getOrgActivity, getOrgDetail } from "@/lib/platform";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  WORKER: "Worker",
};

export default async function SuperOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const [org, activity] = await Promise.all([getOrgDetail(id), getOrgActivity(id)]);
  if (!org) notFound();

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const money = (n: number) => `${org.currencySymbol || "$"}${n.toFixed(2)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Link
          href="/super/orgs"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Companies
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{org.name}</h1>
            {org.active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="destructive">Suspended</Badge>
            )}
            <Badge variant="secondary">{planLabel(org.plan)}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrgManageSheet>
              <OrgPlanSelect orgId={org.id} current={org.plan} />
              <InviteAdminForm orgId={org.id} />
              <OrgFeatureToggles
                orgId={org.id}
                features={{
                  invoicing: org.featureInvoicing,
                  estimates: org.featureEstimates,
                  portal: org.featurePortal,
                }}
              />
              <OrgLifecycleControls orgId={org.id} name={org.name} active={org.active} />
            </OrgManageSheet>
            <OrgMessageSheet orgId={org.id} orgName={org.name} />
            <Button asChild size="sm" variant="outline">
              <a href={`/super/orgs/${org.id}/export`}>
                <Download className="h-4 w-4" />
                Export
              </a>
            </Button>
            <EnterSupportButton orgId={org.id} />
          </div>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          /{org.slug} · created {dateFmt.format(org.createdAt)}
          {activity.lastActivity
            ? ` · last active ${dateFmt.format(activity.lastActivity)}`
            : " · no activity yet"}
          {org.joinCode ? ` · join code ${org.joinCode}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={Users} value={String(org._count.users)} label="Users" />
        <StatTile icon={ClipboardList} value={String(org._count.records)} label="Work records" />
        <StatTile icon={FolderKanban} value={String(org._count.projects)} label="Projects" />
        <StatTile icon={Building2} value={String(org._count.customers)} label="Customers" />
        <StatTile icon={Receipt} value={String(org._count.invoices)} label="Invoices" />
        <StatTile icon={DollarSign} value={money(org.revenue)} label="Paid revenue" tone="success" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Most active
          </h2>
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
              {activity.topUsers.length === 0 ? (
                <p className="px-4 py-4 text-sm text-neutral-400">No work records yet.</p>
              ) : (
                activity.topUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="truncate text-sm text-neutral-900 dark:text-neutral-100">{u.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {u.records} records
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <Activity className="h-4 w-4" />
            Recent activity
          </h2>
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
              {activity.recent.length === 0 ? (
                <p className="px-4 py-4 text-sm text-neutral-400">Nothing logged yet.</p>
              ) : (
                activity.recent.map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-neutral-900 dark:text-neutral-100">{e.summary}</div>
                      <div className="truncate text-xs text-neutral-400">{e.actorName}</div>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-400">
                      {timeFmt.format(e.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <OrgNotesPanel orgId={org.id} notes={org.notes} />

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Users ({org.users.length})
        </h2>
        <Card>
          <CardContent className="stagger-children flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
            {org.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{u.name}</span>
                    {!u.active && (
                      <span className="text-[10px] font-semibold uppercase text-neutral-400">inactive</span>
                    )}
                  </div>
                  <span className="truncate text-xs text-neutral-400">{u.email}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                  {u.active && <ViewAsUserButton orgId={org.id} userId={u.id} />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
