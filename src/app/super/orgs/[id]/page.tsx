import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, ClipboardList, DollarSign, FolderKanban, Receipt, Users } from "lucide-react";

import { Eye, LogIn } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { OrgFeatureToggles } from "@/components/super/OrgFeatureToggles";
import { OrgLifecycleControls } from "@/components/super/OrgLifecycleControls";
import { enterOrgAction } from "@/actions/impersonation";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getOrgDetail } from "@/lib/platform";

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
  const org = await getOrgDetail(id);
  if (!org) notFound();

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const money = (n: number) => `${org.currencySymbol || "$"}${n.toFixed(2)}`;

  return (
    <div className="flex flex-col gap-6">
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
          </div>
          <div className="flex items-center gap-2">
            <form action={enterOrgAction.bind(null, org.id, "READ_ONLY")}>
              <Button type="submit" size="sm" variant="outline">
                <Eye className="h-4 w-4" />
                View only
              </Button>
            </form>
            <form action={enterOrgAction.bind(null, org.id, "FULL")}>
              <Button type="submit" size="sm" variant="outline">
                <LogIn className="h-4 w-4" />
                Enter as support
              </Button>
            </form>
          </div>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          /{org.slug} · created {dateFmt.format(org.createdAt)}
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

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Users ({org.users.length})
        </h2>
        <Card>
          <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
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
                <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <OrgFeatureToggles
        orgId={org.id}
        features={{
          invoicing: org.featureInvoicing,
          estimates: org.featureEstimates,
          portal: org.featurePortal,
        }}
      />

      <OrgLifecycleControls orgId={org.id} name={org.name} active={org.active} />
    </div>
  );
}
