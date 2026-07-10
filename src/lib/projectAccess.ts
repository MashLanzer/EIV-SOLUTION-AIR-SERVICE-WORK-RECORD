import type { Session } from "next-auth";

import { prisma } from "@/lib/prisma";

// Team ids a worker belongs to. Workers only see/act on projects assigned to
// one of their teams; admins bypass this entirely.
export async function getWorkerTeamIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  const memberships = await prisma.teamMembership.findMany({
    where: { userId },
    select: { teamId: true },
  });
  return memberships.map((m) => m.teamId);
}

// Pure access decision, kept separate so it's unit-testable without a DB.
// Admins can reach any project in their org; a worker only when the project is
// assigned to one of their teams.
export function decideProjectAccess(
  role: string,
  projectTeamId: string | null,
  workerTeamIds: string[]
): boolean {
  if (role === "ADMIN") return true;
  if (!projectTeamId) return false;
  return workerTeamIds.includes(projectTeamId);
}

// Central authorization check for the crew-facing project pages and the
// mutations they can reach.
export async function canAccessProject(
  session: Session,
  projectId: string
): Promise<boolean> {
  const organizationId = session.user.organizationId;
  if (!organizationId) return false;

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { teamId: true },
  });
  if (!project) return false;

  const teamIds =
    session.user.role === "ADMIN" ? [] : await getWorkerTeamIds(session.user.id);
  return decideProjectAccess(session.user.role, project.teamId, teamIds);
}

// A project detail page lives at two paths (admin + worker); shared mutations
// revalidate both so whichever area the actor is in refreshes.
export function projectDetailPaths(projectId: string): string[] {
  return [`/admin/projects/${projectId}`, `/records/projects/${projectId}`];
}

export function photoDetailPaths(projectId: string, photoId: string): string[] {
  return [
    `/admin/projects/${projectId}/photos/${photoId}`,
    `/records/projects/${projectId}/photos/${photoId}`,
  ];
}
