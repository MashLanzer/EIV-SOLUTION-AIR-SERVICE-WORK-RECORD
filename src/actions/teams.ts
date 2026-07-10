"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { teamSchema } from "@/lib/validations";

export type TeamFormState = { error?: string } | undefined;

export async function createTeamAction(
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const parsed = teamSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const team = await prisma.team.create({
    data: { organizationId, name: parsed.data.name },
    select: { id: true },
  });
  revalidatePath("/admin/teams");
  redirect(`/admin/teams/${team.id}`);
}

export async function updateTeamAction(
  teamId: string,
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const parsed = teamSchema.safeParse({ name: formData.get("name") });
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
    data: { name: parsed.data.name },
  });
  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${teamId}`);
  redirect(`/admin/teams/${teamId}?saved=1`);
}

export async function deleteTeamAction(teamId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  // Memberships cascade; projects' teamId is nulled by the FK.
  await prisma.team.deleteMany({ where: { id: teamId, organizationId } });
  revalidatePath("/admin/teams");
  redirect("/admin/teams");
}

// Replace a team's whole membership set with the checked users. Only users in
// the caller's org are accepted, so a crafted userId can't be added.
export async function setTeamMembersAction(teamId: string, formData: FormData) {
  const session = await requireAdmin();
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
