import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  Image as ImageIcon,
  Users2,
} from "lucide-react";
import type { ProjectStatus } from "@prisma/client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamAvatar } from "@/components/teams/TeamColorDot";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const SECTION_ORDER: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED"];

// Compact stat, shown 4-up inside the team header card (nested context, so it
// stays a light bordered cell rather than a full Card tile). Mirrors the admin
// team detail header.
function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users2;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 text-center">
      <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
      <div className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
}

// A worker's read-only view of one of their teams: the crew roster and the
// team's jobsites. Management (adding people, assigning projects) stays admin-
// only; the worker just sees what they're part of, with projects linking into
// the worker project detail they can already reach.
export default async function WorkerTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";

  // A worker may only open a team they belong to.
  if (!isAdmin) {
    const myTeamIds = await getWorkerTeamIds(session.user.id);
    if (!myTeamIds.includes(id)) notFound();
  }

  const team = await prisma.team.findFirst({
    where: { id, organizationId },
    include: {
      memberships: {
        select: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, role: true },
          },
        },
      },
      projects: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true },
      },
    },
  });
  if (!team) notFound();

  const [photoCount, jobCount] = await Promise.all([
    prisma.photo.count({ where: { organizationId, project: { teamId: id } } }),
    prisma.workRecord.count({ where: { organizationId, project: { teamId: id } } }),
  ]);

  const members = team.memberships
    .map((m) => m.user)
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  const activeProjects = team.projects.filter((p) => p.status === "ACTIVE").length;
  const byStatus = SECTION_ORDER.map((status) => ({
    status,
    items: team.projects.filter((p) => p.status === status),
  })).filter((g) => g.items.length > 0);

  const dict = await getT();
  const t = dict.teams;
  const locale = await getLocale();
  const teamDateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const projectStatusLabel: Record<ProjectStatus, string> = {
    ACTIVE: dict.projects.statusActive,
    ON_HOLD: dict.projects.statusOnHold,
    COMPLETED: dict.projects.statusCompleted,
  };
  const roleLabel = (role: string) =>
    role === "ADMIN" ? t.roleAdmin : role === "SUPERVISOR" ? t.roleSupervisor : t.roleWorker;

  return (
    <div className="flex flex-col gap-4">
      {/* Header: color identity + stats (read-only — no manage actions). */}
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-3 p-4">
          <Link
            href="/records/teams"
            className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.tabTeams}
          </Link>
          <div className="flex items-center gap-3">
            <TeamAvatar name={team.name} color={team.color} seed={team.id} />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {team.name}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                {t.created.replace("{date}", teamDateFmt.format(team.createdAt))}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatTile icon={Users2} value={members.length} label={t.members} />
            <StatTile icon={FolderKanban} value={activeProjects} label={t.active} />
            <StatTile icon={ImageIcon} value={photoCount} label={t.photos} />
            <StatTile icon={ClipboardList} value={jobCount} label={t.jobs} />
          </div>
        </CardContent>
      </Card>

      {/* Crew roster — who's on the team, with "You" marked. */}
      {members.length > 0 && (
        <section
          className="flex animate-fade-up flex-col gap-3"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.members} ({members.length})
          </h2>
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 p-0">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar
                    name={m.name || m.email}
                    avatarUrl={m.avatarUrl}
                    size={36}
                    className="h-9 w-9 text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {m.name || m.email}
                      {m.id === session.user.id && (
                        <span className="text-neutral-500 dark:text-neutral-400">
                          {" "}
                          ({t.you})
                        </span>
                      )}
                    </div>
                    <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {m.email}
                    </div>
                  </div>
                  <Badge variant={m.role === "ADMIN" ? "default" : "secondary"}>
                    {roleLabel(m.role)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Team projects grouped by status → the worker project detail. */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.projectsCount.replace("{n}", String(team.projects.length))}
        </h2>
        {team.projects.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={FolderKanban}
                title={t.noProjectsAssigned}
                description={t.noProjectsAssignedDesc}
              />
            </CardContent>
          </Card>
        ) : (
          byStatus.map(({ status, items }) => (
            <div key={status} className="flex flex-col gap-1.5">
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {projectStatusLabel[status]} ({items.length})
              </div>
              <Card>
                <CardContent className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 p-0">
                  {items.map((p) => (
                    <Link
                      key={p.id}
                      href={`/records/projects/${p.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                        <FolderKanban className="h-5 w-5" />
                      </span>
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                          {p.name}
                        </span>
                        <ProjectStatusBadge status={p.status} />
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
