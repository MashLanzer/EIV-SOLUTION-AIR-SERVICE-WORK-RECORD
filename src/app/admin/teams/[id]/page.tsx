import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  Image as ImageIcon,
  Users2,
} from "lucide-react";
import type { ProjectStatus } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SuccessToast } from "@/components/ui/success-toast";
import { AssignProjectsForm } from "@/components/teams/AssignProjectsForm";
import { DeleteTeamButton } from "@/components/teams/DeleteTeamButton";
import { TeamAvatar } from "@/components/teams/TeamColorDot";
import { TeamForm } from "@/components/teams/TeamForm";
import { TeamMembersForm } from "@/components/teams/TeamMembersForm";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { PROJECT_STATUS_LABELS } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

const SECTION_ORDER: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED"];

const teamDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

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
      <Icon className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
      <div className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
}

export default async function AdminTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const { id } = await params;
  const { saved } = await searchParams;

  const team = await prisma.team.findFirst({
    where: { id, organizationId },
    include: {
      memberships: { select: { userId: true } },
      projects: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, status: true },
      },
    },
  });
  if (!team) notFound();

  const [users, allProjects, photoCount, jobCount] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.project.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    }),
    prisma.photo.count({ where: { organizationId, project: { teamId: id } } }),
    prisma.workRecord.count({ where: { organizationId, project: { teamId: id } } }),
  ]);

  const memberIds = team.memberships.map((m) => m.userId);
  const assignedIds = team.projects.map((p) => p.id);
  const activeProjects = team.projects.filter((p) => p.status === "ACTIVE").length;
  const byStatus = SECTION_ORDER.map((status) => ({
    status,
    items: team.projects.filter((p) => p.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message="Team saved" aboveMobileNav />}

      {/* Header: color identity + stats */}
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-4 p-4">
          <Link
            href="/admin/teams"
            className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Teams
          </Link>
          <div className="flex items-center gap-3">
            <TeamAvatar name={team.name} color={team.color} seed={team.id} />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {team.name}
              </h1>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
                Created {teamDateFmt.format(team.createdAt)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatTile icon={Users2} value={memberIds.length} label="Members" />
            <StatTile icon={FolderKanban} value={activeProjects} label="Active" />
            <StatTile icon={ImageIcon} value={photoCount} label="Photos" />
            <StatTile icon={ClipboardList} value={jobCount} label="Jobs" />
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card
        className="animate-fade-up"
        style={{ animationDelay: "40ms", animationFillMode: "both" }}
      >
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Add people to your company first, then assign them here.
            </p>
          ) : (
            <TeamMembersForm teamId={team.id} users={users} memberIds={memberIds} />
          )}
        </CardContent>
      </Card>

      {/* Assign projects to this team */}
      <Card
        className="animate-fade-up"
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
      >
        <CardHeader>
          <CardTitle>Assign projects</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignProjectsForm
            teamId={team.id}
            projects={allProjects}
            assignedIds={assignedIds}
          />
        </CardContent>
      </Card>

      {/* Team projects grouped by status */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Projects ({team.projects.length})
        </h2>
        {team.projects.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={FolderKanban}
                title="No projects assigned"
                description="Use “Assign projects” above to add this team to a jobsite."
              />
            </CardContent>
          </Card>
        ) : (
          byStatus.map(({ status, items }) => (
            <div key={status} className="flex flex-col gap-1.5">
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {PROJECT_STATUS_LABELS[status]} ({items.length})
              </div>
              <Card>
                <CardContent className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 p-0">
                  {items.map((p) => (
                    <Link
                      key={p.id}
                      href={`/admin/projects/${p.id}`}
                      className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                          {p.name}
                        </span>
                        <ProjectStatusBadge status={p.status} />
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </section>

      {/* Manage */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "160ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Manage
        </h2>
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Team details
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-4 px-4 pb-4">
              <TeamForm teamId={team.id} defaultName={team.name} defaultColor={team.color} />
              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                <DeleteTeamButton teamId={team.id} />
              </div>
            </div>
          </details>
        </Card>
      </section>
    </div>
  );
}
