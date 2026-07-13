import Link from "next/link";
import { Search, Shield, UserPlus, Users, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { WorkersSection, type WorkerStat } from "@/components/workers/WorkersTable";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import type { Prisma } from "@prisma/client";

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3 sm:p-4">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent sm:flex">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 sm:text-2xl">
            {value}
          </div>
          <div className="truncate text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
            {label}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminWorkersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const rawParams = await searchParams;
  const rawQ = Array.isArray(rawParams.q) ? rawParams.q[0] : rawParams.q;
  const query = rawQ?.trim() || undefined;

  const where: Prisma.UserWhereInput = {
    organizationId,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, recordStats] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { name: "asc" } }),
    // Jobs submitted + last activity per person (submittedById is SetNull, so
    // some records have no author - those don't attribute to anyone).
    prisma.workRecord.groupBy({
      by: ["submittedById"],
      where: { organizationId },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
  ]);

  const stats: Record<string, WorkerStat> = {};
  for (const row of recordStats) {
    if (!row.submittedById) continue;
    stats[row.submittedById] = {
      jobs: row._count._all,
      lastActive: row._max.createdAt?.toISOString() ?? null,
    };
  }

  const admins = users.filter((u) => u.role === "ADMIN");
  const fieldWorkers = users.filter((u) => u.role !== "ADMIN");
  const activeCount = users.filter((u) => u.active).length;
  const t = (await getT()).workers;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t.team}
        </h1>
        <Button asChild>
          <Link href="/admin/workers/new">
            <UserPlus className="h-4 w-4" />
            {t.newWorker}
          </Link>
        </Button>
      </div>

      {/* Team summary - only when not searching, so the numbers reflect the
          whole roster rather than the filtered subset. */}
      {!query && users.length > 0 && (
        <div className="grid animate-fade-up grid-cols-3 gap-3 sm:gap-4">
          <StatTile icon={Users} value={users.length} label={t.members} />
          <StatTile icon={Users} value={activeCount} label={t.active} />
          <StatTile icon={Shield} value={admins.length} label={t.admins} />
        </div>
      )}

      <form method="get" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        <Input
          type="search"
          name="q"
          placeholder={t.searchPlaceholder}
          defaultValue={query}
          className="pl-9"
          aria-label={t.searchAria}
        />
      </form>

      {users.length === 0 ? (
        query ? (
          <EmptyState
            icon={SearchX}
            title={t.noMatches}
            description={t.nothingFound.replace("{q}", query)}
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link href="/admin/workers">{t.clearSearch}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title={t.noAccounts}
            description={t.noAccountsDesc}
          />
        )
      ) : (
        <>
          <WorkersSection
            title={t.administrators}
            workers={admins}
            stats={stats}
            className="animate-fade-up"
            style={{ animationDelay: "40ms", animationFillMode: "both" }}
          />
          <WorkersSection
            title={t.fieldWorkers}
            workers={fieldWorkers}
            stats={stats}
            className="animate-fade-up"
            style={{ animationDelay: "80ms", animationFillMode: "both" }}
          />
        </>
      )}
    </div>
  );
}
