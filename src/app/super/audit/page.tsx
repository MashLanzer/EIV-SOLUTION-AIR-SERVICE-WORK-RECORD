import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { ScrollText } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getGlobalAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export default async function SuperAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  await requireSuperAdmin();
  const { scope } = await searchParams;
  const platformOnly = scope === "platform";
  const events = await getGlobalAuditLog({ platformOnly });

  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Audit log</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Activity across every company, newest first.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/super/audit" active={!platformOnly}>
          All activity
        </FilterChip>
        <FilterChip href="/super/audit?scope=platform" active={platformOnly}>
          Platform actions
        </FilterChip>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={ScrollText} title="Nothing logged yet" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="stagger-children flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
            {events.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-900 dark:text-neutral-100">{e.summary}</span>
                    {e.isPlatform && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                        <ShieldCheck className="h-3 w-3" />
                        Platform
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-400">
                    {e.organization ? (
                      <Link href={`/super/orgs/${e.organization.id}`} className="hover:text-primary">
                        {e.organization.name}
                      </Link>
                    ) : (
                      <span>Platform</span>
                    )}
                    <span>·</span>
                    <span>{e.actorName}</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-neutral-400">
                  {fmt.format(e.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
