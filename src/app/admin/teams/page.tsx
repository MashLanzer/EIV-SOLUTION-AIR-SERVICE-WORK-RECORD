import Link from "next/link";
import { ChevronRight, FolderKanban, Plus, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectsTeamsTabs } from "@/components/projects/ProjectsTeamsTabs";
import { TeamAvatar } from "@/components/teams/TeamColorDot";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

export default async function AdminTeamsPage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const teams = await prisma.team.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true, projects: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <ProjectsTeamsTabs />
        <Button asChild>
          <Link href="/admin/teams/new">
            <Plus className="h-4 w-4" />
            New Team
          </Link>
        </Button>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No teams yet"
          description="Create a team (a crew) to group workers and assign them to projects."
          action={
            <Button asChild variant="outline" className="mt-2">
              <Link href="/admin/teams/new">
                <Plus className="h-4 w-4" />
                New Team
              </Link>
            </Button>
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
                      <span className="tabular-nums">{t._count.memberships}</span>
                      member{t._count.memberships === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5" />
                      <span className="tabular-nums">{t._count.projects}</span>
                      project{t._count.projects === 1 ? "" : "s"}
                    </span>
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
