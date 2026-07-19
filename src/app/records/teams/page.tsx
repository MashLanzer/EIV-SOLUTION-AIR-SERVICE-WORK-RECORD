import Link from "next/link";
import { ChevronRight, FolderKanban, Users, Users2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { TeamAvatar } from "@/components/teams/TeamColorDot";
import { WorkerProjectsTabs } from "@/components/projects/WorkerProjectsTabs";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Up to this many member faces per card; the rest fold into a "+N" chip
// (matches the admin teams list).
const MAX_FACES = 4;

// A worker's read-only view of their teams. Team management stays with admins;
// here a worker just sees the crews they're on — who's on them, how many
// projects, and how many are active — and can open one to see the roster and
// its jobsites. Admins can browse it too (they also have the full admin area).
export default async function WorkerTeamsPage() {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const userId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  const teamWhere = isAdmin
    ? { organizationId }
    : { organizationId, id: { in: await getWorkerTeamIds(userId) } };

  const teams = await prisma.team.findMany({
    where: teamWhere,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { memberships: true, projects: true } },
      memberships: {
        take: MAX_FACES,
        select: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  const teamIds = teams.map((tm) => tm.id);
  const [activeByTeam, teammateGroups] = await Promise.all([
    // Active-project counts per team, aggregated so the list scales.
    prisma.project.groupBy({
      by: ["teamId"],
      where: { organizationId, status: "ACTIVE", teamId: { in: teamIds } },
      _count: { _all: true },
    }),
    // Distinct people across my teams (for the "teammates" coverage stat).
    prisma.teamMembership.groupBy({
      by: ["userId"],
      where: { teamId: { in: teamIds } },
    }),
  ]);

  const activeCount = new Map<string, number>(
    activeByTeam.map((g) => [g.teamId as string, g._count._all])
  );
  const activeTotal = activeByTeam.reduce((sum, g) => sum + g._count._all, 0);
  // Teammates = everyone on my teams except me.
  const teammateCount = teammateGroups.filter((g) => g.userId !== userId).length;

  const t = (await getT()).teams;

  return (
    <div className="flex flex-col gap-3">
      <WorkerProjectsTabs />
      <PageHeader title={t.myTeams} />

      {teams.length === 0 ? (
        <EmptyState
          icon={Users2}
          title={t.notOnAnyTeam}
          description={t.notOnAnyTeamDesc}
        />
      ) : (
        <>
          <div className="grid animate-fade-up grid-cols-3 gap-3">
            <StatTile icon={Users2} value={teams.length} label={t.tabTeams} />
            <StatTile icon={Users} value={teammateCount} label={t.teammates} />
            <StatTile icon={FolderKanban} value={activeTotal} label={t.activeProjects} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {teams.map((tm) => {
              const active = activeCount.get(tm.id) ?? 0;
              const extraMembers = tm._count.memberships - tm.memberships.length;
              return (
                <Card
                  key={tm.id}
                  className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  <Link
                    href={`/records/teams/${tm.id}`}
                    className="flex flex-col gap-3 rounded-xl p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                  >
                    <div className="flex items-center gap-3">
                      <TeamAvatar name={tm.name} color={tm.color} seed={tm.id} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                          {tm.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            <Users2 className="h-3.5 w-3.5" />
                            {(tm._count.memberships === 1 ? t.memberCountOne : t.memberCountMany).replace("{n}", String(tm._count.memberships))}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FolderKanban className="h-3.5 w-3.5" />
                            {(tm._count.projects === 1 ? t.projectCountOne : t.projectCountMany).replace("{n}", String(tm._count.projects))}
                          </span>
                          {active > 0 && (
                            <span className="flex items-center gap-1.5 text-neutral-900 dark:text-neutral-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                              <span className="tabular-nums">{active}</span> {t.active}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                    </div>

                    {/* Member faces: a quick read of who's on the crew. */}
                    {tm.memberships.length > 0 && (
                      <div className="flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                        <div className="flex -space-x-2">
                          {tm.memberships.map((m) => (
                            <Avatar
                              key={m.user.id}
                              name={m.user.name}
                              avatarUrl={m.user.avatarUrl}
                              size={28}
                              className="h-7 w-7 text-[11px] ring-2 ring-white dark:ring-neutral-900"
                            />
                          ))}
                        </div>
                        {extraMembers > 0 && (
                          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            +{extraMembers}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
