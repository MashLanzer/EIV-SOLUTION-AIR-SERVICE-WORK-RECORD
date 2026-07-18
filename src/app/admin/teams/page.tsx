import Link from "next/link";
import { ChevronRight, FolderKanban, Users2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { NewTeamButton } from "@/components/teams/NewTeamButton";
import { TeamAvatar } from "@/components/teams/TeamColorDot";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function AdminTeamsPage() {
  const session = await requirePermission("teams.manage");
  const organizationId = requireOrgId(session);

  const [teams, activeByTeam, users, allProjects] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: { _count: { select: { memberships: true, projects: true } } },
    }),
    // One aggregate for active-project counts across all teams, so the list
    // scales regardless of how many projects each team has.
    prisma.project.groupBy({
      by: ["teamId"],
      where: { organizationId, status: "ACTIVE", teamId: { not: null } },
      _count: { _all: true },
    }),
    // For the "new team" sheet: seed members/projects up front.
    prisma.user.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.project.findMany({
      where: { organizationId, status: { not: "COMPLETED" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const activeCount = new Map<string, number>(
    activeByTeam.map((g) => [g.teamId as string, g._count._all])
  );
  const tr = (await getT()).teams;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <SectionTabs family="structure" />
        </div>
        <NewTeamButton users={users} projects={allProjects} />
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={Users2}
          title={tr.noTeams}
          description={tr.noTeamsDesc}
          action={
            <NewTeamButton
              users={users}
              projects={allProjects}
              variant="outline"
              className="mt-2"
            />
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((t) => (
            <Card
              key={t.id}
              className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
            >
              <Link
                href={`/admin/teams/${t.id}`}
                className="flex items-center gap-3 rounded-xl p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
              >
                <TeamAvatar name={t.name} color={t.color} seed={t.id} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                    {t.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Users2 className="h-3.5 w-3.5" />
                      {(t._count.memberships === 1 ? tr.memberCountOne : tr.memberCountMany).replace("{n}", String(t._count.memberships))}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5" />
                      {(t._count.projects === 1 ? tr.projectCountOne : tr.projectCountMany).replace("{n}", String(t._count.projects))}
                    </span>
                    {(activeCount.get(t.id) ?? 0) > 0 && (
                      <span className="flex items-center gap-1.5 text-neutral-900 dark:text-neutral-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                        <span className="tabular-nums">{activeCount.get(t.id)}</span> {tr.active}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
