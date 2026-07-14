import Link from "next/link";
import { Building2, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getOrgSummaries } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function SuperOrgsPage() {
  await requireSuperAdmin();
  const orgs = await getOrgSummaries();

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Companies</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {orgs.length} {orgs.length === 1 ? "company" : "companies"} on the platform.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/super/orgs/new">
            <Plus className="h-4 w-4" />
            New company
          </Link>
        </Button>
      </div>

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={Building2} title="No companies yet" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/super/orgs/${org.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <div className="min-w-0 flex-1">
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
                  <span className="text-xs text-neutral-400">
                    /{org.slug} · {dateFmt.format(org.createdAt)}
                  </span>
                </div>
                <div className="hidden shrink-0 items-center gap-5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400 sm:flex">
                  <span>{org.users} users</span>
                  <span>{org.records} records</span>
                  <span>{org.invoices} invoices</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
