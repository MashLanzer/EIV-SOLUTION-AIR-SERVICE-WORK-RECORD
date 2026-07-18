import Link from "next/link";
import { ChevronRight, FolderKanban, UserX, Users, Users2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { NewTeamButton } from "@/components/teams/NewTeamButton";
import { TeamAvatar } from "@/components/teams/TeamColorDot";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

// Up to this many member faces per team card; the rest fold into a "+N" chip.
const MAX_FACES = 4;

function MemberFace({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      className="h-7 w-7 rounded-full object-cover ring-2 ring-white dark:ring-neutral-900"
    />
  ) : (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-600 ring-2 ring-white dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-900">
      {initial}
    </span>
  );
}

export default async function AdminTeamsPage() {
  const session = await requirePermission("teams.manage");
  const organizationId = requireOrgId(session);

  const [teams, activeByTeam, memberGroups, users, allProjects] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { memberships: true, projects: true } },
        // A handful of member faces for the card; total still comes from _count.
        memberships: {
          take: MAX_FACES,
          select: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    }),
    // One aggregate for active-project counts across all teams, so the list
    // scales regardless of how many projects each team has.
    prisma.project.groupBy({
      by: ["teamId"],
      where: { organizationId, status: "ACTIVE", teamId: { not: null } },
      _count: { _all: true },
    }),
    // Distinct people who belong to at least one team (for the coverage stats).
    prisma.teamMembership.groupBy({
      by: ["userId"],
      where: { team: { organizationId } },
    }),
    // For the "new team" sheet + the "not on a team" coverage stat.
    prisma.user.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, active: true },
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
  const activeProjectsTotal = activeByTeam.reduce((sum, g) => sum + g._count._all, 0);
  const memberIds = new Set(memberGroups.map((g) => g.userId));
  // Field crew (WORKER) who aren't on any team yet — a coverage gap worth
  // surfacing so nobody is left unassigned.
  const unassignedFieldCount = users.filter(
    (u) => u.active && u.role === "WORKER" && !memberIds.has(u.id)
  ).length;

  const tr = (await getT()).teams;

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="structure" />
      <PageHeader
        title={tr.tabTeams}
        action={<NewTeamButton users={users} projects={allProjects} />}
      />

      {teams.length > 0 && (
        <div className="grid animate-fade-up grid-cols-3 gap-3 sm:gap-4">
          <StatTile icon={Users} value={memberIds.size} label={tr.members} />
          <StatTile icon={FolderKanban} value={activeProjectsTotal} label={tr.activeProjects} />
          <StatTile
            icon={UserX}
            value={unassignedFieldCount}
            label={tr.unassigned}
            tone={unassignedFieldCount > 0 ? "warning" : "default"}
          />
        </div>
      )}

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
          {teams.map((t) => {
            const active = activeCount.get(t.id) ?? 0;
            const extraMembers = t._count.memberships - t.memberships.length;
            return (
              <Card
                key={t.id}
                className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <Link
                  href={`/admin/teams/${t.id}`}
                  className="flex flex-col gap-3 rounded-xl p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                >
                  <div className="flex items-center gap-3">
                    <TeamAvatar name={t.name} color={t.color} seed={t.id} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                        {t.name}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="flex items-center gap-1.5">
                          <Users2 className="h-3.5 w-3.5" />
                          {(t._count.memberships === 1 ? tr.memberCountOne : tr.memberCountMany).replace("{n}", String(t._count.memberships))}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FolderKanban className="h-3.5 w-3.5" />
                          {(t._count.projects === 1 ? tr.projectCountOne : tr.projectCountMany).replace("{n}", String(t._count.projects))}
                        </span>
                        {active > 0 && (
                          <span className="flex items-center gap-1.5 text-neutral-900 dark:text-neutral-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                            <span className="tabular-nums">{active}</span> {tr.active}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  </div>

                  {/* Member faces: a quick read of who's on the crew. */}
                  {t.memberships.length > 0 && (
                    <div className="flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      <div className="flex -space-x-2">
                        {t.memberships.map((m) => (
                          <MemberFace key={m.user.id} name={m.user.name} avatarUrl={m.user.avatarUrl} />
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
      )}
    </div>
  );
}
