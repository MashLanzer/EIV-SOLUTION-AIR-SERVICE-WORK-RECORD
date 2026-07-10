import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown, FolderKanban } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SuccessToast } from "@/components/ui/success-toast";
import { DeleteTeamButton } from "@/components/teams/DeleteTeamButton";
import { TeamForm } from "@/components/teams/TeamForm";
import { TeamMembersForm } from "@/components/teams/TeamMembersForm";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

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

  const users = await prisma.user.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
  const memberIds = team.memberships.map((m) => m.userId);

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message="Team saved" aboveMobileNav />}

      <div className="animate-fade-up">
        <Link
          href="/admin/teams"
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Teams
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {team.name}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {memberIds.length} member{memberIds.length === 1 ? "" : "s"} ·{" "}
          {team.projects.length} project{team.projects.length === 1 ? "" : "s"}
        </p>
      </div>

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

      {/* Assigned projects */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Assigned projects ({team.projects.length})
        </h2>
        {team.projects.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={FolderKanban}
                title="No projects assigned"
                description="Assign this team to a project from the project's edit page."
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 p-0">
              {team.projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {p.name}
                    </span>
                    <ProjectStatusBadge status={p.status} />
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Manage */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
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
              <TeamForm teamId={team.id} defaultName={team.name} />
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
