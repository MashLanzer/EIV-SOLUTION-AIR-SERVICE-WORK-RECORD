import Link from "next/link";
import { Building2, ChevronRight, Plus, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OrgListControls } from "@/components/super/OrgListControls";
import { requireSuperAdmin } from "@/lib/superAdmin";
import {
  getOrgSummaries,
  type OrgPlanFilter,
  type OrgSort,
  type OrgStatusFilter,
} from "@/lib/platform";
import { planLabel } from "@/lib/plans";

export const dynamic = "force-dynamic";

const STATUS_VALUES: OrgStatusFilter[] = ["all", "active", "suspended"];
const PLAN_VALUES: OrgPlanFilter[] = ["all", "FREE", "PRO", "none"];
const SORT_VALUES: OrgSort[] = ["newest", "oldest", "name", "recent", "idle", "users", "records"];

function oneOf<T extends string>(raw: string | undefined, allowed: T[], fallback: T): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

// "3d ago" style relative label for last activity, kept terse for the list.
function relativeLabel(d: Date | null): string {
  if (!d) return "never active";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "active today";
  if (days === 1) return "active yesterday";
  if (days < 30) return `active ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `active ${months}mo ago`;
  return `active ${Math.floor(months / 12)}y ago`;
}

export default async function SuperOrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; plan?: string; sort?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const status = oneOf(sp.status, STATUS_VALUES, "all");
  const plan = oneOf(sp.plan, PLAN_VALUES, "all");
  const sort = oneOf(sp.sort, SORT_VALUES, "newest");

  const orgs = await getOrgSummaries({ status, plan, sort });
  const filtered = status !== "all" || plan !== "all";

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
            {orgs.length} {orgs.length === 1 ? "company" : "companies"}
            {filtered ? " match" : " on the platform"}.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/super/orgs/new">
            <Plus className="h-4 w-4" />
            New company
          </Link>
        </Button>
      </div>

      <OrgListControls current={{ status, plan, sort }} />

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            {filtered ? (
              <EmptyState
                icon={SearchX}
                title="No companies match"
                description="Try clearing the filters."
                action={
                  <Button asChild variant="outline" className="mt-2">
                    <Link href="/super/orgs">Clear filters</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={Building2} title="No companies yet" />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="stagger-children flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
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
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      {planLabel(org.plan)}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    /{org.slug} · {dateFmt.format(org.createdAt)} · {relativeLabel(org.lastActivityAt)}
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
