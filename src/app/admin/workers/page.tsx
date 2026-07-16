import Link from "next/link";
import { Search, Shield, Users, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { NewWorkerButton } from "@/components/workers/NewWorkerButton";
import { WorkersSection, type WorkerStat } from "@/components/workers/WorkersTable";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";
import type { Prisma } from "@prisma/client";

export default async function AdminWorkersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("workers.manage");
  const organizationId = requireOrgId(session);
  const rawParams = await searchParams;
  const rawQ = Array.isArray(rawParams.q) ? rawParams.q[0] : rawParams.q;
  const query = rawQ?.trim() || undefined;
  const rawSkill = Array.isArray(rawParams.skill) ? rawParams.skill[0] : rawParams.skill;
  const skill = rawSkill?.trim() || undefined;

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
    ...(skill ? { skills: { some: { name: { equals: skill, mode: "insensitive" } } } } : {}),
  };

  const [users, recordStats, skillNames, teams] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { name: "asc" } }),
    // Jobs submitted + last activity per person (submittedById is SetNull, so
    // some records have no author - those don't attribute to anyone).
    prisma.workRecord.groupBy({
      by: ["submittedById"],
      where: { organizationId },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    // Distinct skills in the org, for the skill filter chips.
    prisma.userSkill.findMany({
      where: { user: { organizationId } },
      distinct: ["name"],
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    // Teams to seed on the "new worker" sheet.
    prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Preserve the text query when switching skill chips.
  const skillHref = (s?: string) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (s) p.set("skill", s);
    const qs = p.toString();
    return qs ? `/admin/workers?${qs}` : "/admin/workers";
  };

  const stats: Record<string, WorkerStat> = {};
  for (const row of recordStats) {
    if (!row.submittedById) continue;
    stats[row.submittedById] = {
      jobs: row._count._all,
      lastActive: row._max.createdAt?.toISOString() ?? null,
    };
  }

  const admins = users.filter((u) => u.role === "ADMIN");
  const supervisors = users.filter((u) => u.role === "SUPERVISOR");
  const fieldWorkers = users.filter((u) => u.role === "WORKER");
  const activeCount = users.filter((u) => u.active).length;
  const t = (await getT()).workers;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.team} action={<NewWorkerButton teams={teams} />} />

      {/* Team summary - only when not filtering, so the numbers reflect the
          whole roster rather than the filtered subset. */}
      {!query && !skill && users.length > 0 && (
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
        {skill && <input type="hidden" name="skill" value={skill} />}
      </form>

      {/* Skill filter - the org's skills as chips, so an admin can find who's
          qualified for a job. */}
      {skillNames.length > 0 && (
        <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
          <FilterChip href={skillHref()} active={!skill}>
            {t.allSkills}
          </FilterChip>
          {skillNames.map((s) => (
            <FilterChip
              key={s.name}
              href={skillHref(s.name)}
              active={skill?.toLowerCase() === s.name.toLowerCase()}
            >
              {s.name}
            </FilterChip>
          ))}
        </div>
      )}

      {users.length === 0 ? (
        query || skill ? (
          <EmptyState
            icon={SearchX}
            title={t.noMatches}
            description={t.nothingFound.replace("{q}", query ?? skill ?? "")}
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
          {/* Only surfaced once at least one supervisor exists, so orgs that
              don't use the role don't see an empty section. */}
          {supervisors.length > 0 && (
            <WorkersSection
              title={t.supervisors}
              workers={supervisors}
              stats={stats}
              className="animate-fade-up"
              style={{ animationDelay: "80ms", animationFillMode: "both" }}
            />
          )}
          <WorkersSection
            title={t.fieldWorkers}
            workers={fieldWorkers}
            stats={stats}
            className="animate-fade-up"
            style={{ animationDelay: "120ms", animationFillMode: "both" }}
          />
        </>
      )}
    </div>
  );
}
