"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { TEAM_COLORS } from "@/lib/teamColors";
import { teamSchema } from "@/lib/validations";

export type TeamFormState = { error?: string } | undefined;

const COLOR_KEYS = new Set(TEAM_COLORS.map((c) => c.key));

// Keep only a known palette key; anything else stores as null (deterministic
// fallback swatch takes over).
function cleanColor(raw: unknown): string | null {
  return typeof raw === "string" && COLOR_KEYS.has(raw) ? raw : null;
}

export async function createTeamAction(
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const session = await requirePermission("teams.manage");
  const organizationId = requireOrgId(session);

  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const team = await prisma.team.create({
    data: {
      organizationId,
      name: parsed.data.name,
      color: cleanColor(parsed.data.color),
    },
    select: { id: true },
  });

  // Optionally seed the team with members and/or projects right away, both
  // validated against this org so crafted ids can't slip in.
  const userIds = formData
    .getAll("userId")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (userIds.length) {
    const validUsers = await prisma.user.findMany({
      where: { id: { in: userIds }, organizationId },
      select: { id: true },
    });
    if (validUsers.length) {
      await prisma.teamMembership.createMany({
        data: validUsers.map((u) => ({ teamId: team.id, userId: u.id })),
      });
    }
  }
  const projectIds = formData
    .getAll("projectId")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (projectIds.length) {
    await prisma.project.updateMany({
      where: { id: { in: projectIds }, organizationId },
      data: { teamId: team.id },
    });
    revalidatePath("/admin/projects");
  }

  revalidatePath("/admin/teams");
  redirect(`/admin/teams/${team.id}`);
}

export async function updateTeamAction(
  teamId: string,
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const session = await requirePermission("teams.manage");
  const organizationId = requireOrgId(session);

  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const owned = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
    select: { id: true },
  });
  if (!owned) return { error: "Team not found" };

  await prisma.team.update({
    where: { id: teamId },
    data: { name: parsed.data.name, color: cleanColor(parsed.data.color) },
  });
  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${teamId}`);
  redirect(`/admin/teams/${teamId}?saved=1`);
}

export async function deleteTeamAction(teamId: string) {
  const session = await requirePermission("teams.manage");
  const organizationId = requireOrgId(session);
  // Memberships cascade; projects' teamId is nulled by the FK.
  await prisma.team.deleteMany({ where: { id: teamId, organizationId } });
  revalidatePath("/admin/teams");
  redirect("/admin/teams");
}

// Replace a team's whole membership set with the checked users. Only users in
// the caller's org are accepted, so a crafted userId can't be added.
export async function setTeamMembersAction(teamId: string, formData: FormData) {
  const session = await requirePermission("teams.manage");
  const organizationId = requireOrgId(session);

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
    select: { id: true },
  });
  if (!team) return;

  const requested = formData
    .getAll("userId")
    .filter((v): v is string => typeof v === "string");
  const validUsers = requested.length
    ? await prisma.user.findMany({
        where: { id: { in: requested }, organizationId },
        select: { id: true },
      })
    : [];

  await prisma.$transaction([
    prisma.teamMembership.deleteMany({ where: { teamId } }),
    prisma.teamMembership.createMany({
      data: validUsers.map((u) => ({ teamId, userId: u.id })),
    }),
  ]);

  revalidatePath(`/admin/teams/${teamId}`);
  redirect(`/admin/teams/${teamId}?saved=1`);
}

// Assign this team to exactly the checked projects (and unassign the rest that
// were previously on it). All updateMany calls are org-scoped, so a crafted
// projectId from another org can't be moved onto the team.
export async function setTeamProjectsAction(teamId: string, formData: FormData) {
  const session = await requirePermission("teams.manage");
  const organizationId = requireOrgId(session);

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId },
    select: { id: true },
  });
  if (!team) return;

  const requested = formData
    .getAll("projectId")
    .filter((v): v is string => typeof v === "string");
  const validProjects = requested.length
    ? await prisma.project.findMany({
        where: { id: { in: requested }, organizationId },
        select: { id: true },
      })
    : [];
  const keepIds = validProjects.map((p) => p.id);

  await prisma.$transaction([
    // Drop this team from projects that are no longer checked.
    prisma.project.updateMany({
      where: { organizationId, teamId, id: { notIn: keepIds } },
      data: { teamId: null },
    }),
    // Attach the checked projects to this team.
    prisma.project.updateMany({
      where: { organizationId, id: { in: keepIds } },
      data: { teamId },
    }),
  ]);

  revalidatePath("/admin/projects");
  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${teamId}`);
  redirect(`/admin/teams/${teamId}?saved=1`);
}
