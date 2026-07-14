"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeEmailForDuplicateCheck } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { planMaxUsers } from "@/lib/plans";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import {
  createWorkerSchema,
  updateWorkerEmailSchema,
  updateWorkerRoleSchema,
} from "@/lib/validations";

export type WorkerFormState = { error?: string } | undefined;

// True if `userId` is currently the only active admin in this org - demoting
// or deactivating them would leave nobody able to manage the admin tools.
async function isLastActiveAdmin(userId: string, organizationId: string) {
  const otherActiveAdmins = await prisma.user.count({
    where: { organizationId, role: "ADMIN", active: true, id: { not: userId } },
  });
  return otherActiveAdmins === 0;
}

// Catches a Gmail dot/alias variant of an email that's already authorized in
// this org under a different, exact spelling (e.g. "j.doe@gmail.com" vs
// "jdoe@gmail.com" are the same inbox). The user table is small enough that
// scanning it here is cheaper than maintaining a normalized column.
async function findGmailDuplicate(
  email: string,
  organizationId: string,
  excludeUserId?: string
) {
  const normalized = normalizeEmailForDuplicateCheck(email);
  const users = await prisma.user.findMany({
    where: {
      organizationId,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true, name: true, email: true },
  });
  return users.find((u) => normalizeEmailForDuplicateCheck(u.email) === normalized);
}

export async function createWorkerAction(
  _prevState: WorkerFormState,
  formData: FormData
): Promise<WorkerFormState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const parsed = createWorkerSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Plan user cap (legacy/null plans are unlimited). Counts current members;
  // an at-cap company must upgrade before adding another user.
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });
  const cap = planMaxUsers(org?.plan ?? null);
  if (cap !== null) {
    const memberCount = await prisma.user.count({ where: { organizationId } });
    if (memberCount >= cap) {
      return {
        error: `Your plan allows up to ${cap} users. Upgrade to add more.`,
      };
    }
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "That email is already authorized" };
  }
  const gmailDupe = await findGmailDuplicate(email, organizationId);
  if (gmailDupe) {
    return {
      error: `That's the same Gmail inbox as ${gmailDupe.name} (${gmailDupe.email}) once dots and aliases are ignored.`,
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      role: parsed.data.role,
      organizationId,
    },
  });

  // Optionally drop the new person straight onto one or more teams (only teams
  // in this org are accepted).
  const requestedTeams = formData
    .getAll("teamId")
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  if (requestedTeams.length) {
    const validTeams = await prisma.team.findMany({
      where: { id: { in: requestedTeams }, organizationId },
      select: { id: true },
    });
    if (validTeams.length) {
      await prisma.teamMembership.createMany({
        data: validTeams.map((t) => ({ teamId: t.id, userId: user.id })),
      });
    }
  }

  revalidatePath("/admin/workers");
  redirect(`/admin/workers/${user.id}`);
}

export async function toggleWorkerActiveAction(userId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
  if (!user) return;

  // The UI already hides the Deactivate control for the last active admin;
  // this is the server-side backstop against races or repeated form posts.
  if (
    user.active &&
    user.role === "ADMIN" &&
    (await isLastActiveAdmin(userId, organizationId))
  ) {
    throw new Error(
      "Can't deactivate the last active admin. Promote another worker to admin first."
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: !user.active },
  });

  revalidatePath("/admin/workers");
  revalidatePath(`/admin/workers/${userId}`);
}

export async function deleteWorkerAction(userId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
  if (!user) return;

  // Deletion is gated on deactivation: an account must be turned off before
  // it can be permanently removed. The UI only offers Delete once inactive,
  // but re-check here against a stale page or a replayed form post. Because
  // the last active admin can never be deactivated, they can never reach a
  // deletable (inactive) state either - no separate last-admin guard needed.
  if (user.active) {
    throw new Error(
      "Deactivate this worker before deleting their account."
    );
  }

  // The worker's submitted records are kept - submittedById is set null by
  // the FK (ON DELETE SET NULL), so pay history and job records survive.
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/workers");
  redirect("/admin/workers");
}

export type UpdateWorkerEmailState = { error?: string } | undefined;

export async function updateWorkerEmailAction(
  userId: string,
  _prevState: UpdateWorkerEmailState,
  formData: FormData
): Promise<UpdateWorkerEmailState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const parsed = updateWorkerEmailSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // The target must be a member of the caller's org.
  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: { id: true },
  });
  if (!target) return { error: "Worker not found" };

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    return { error: "That email is already authorized" };
  }
  const gmailDupe = await findGmailDuplicate(email, organizationId, userId);
  if (gmailDupe) {
    return {
      error: `That's the same Gmail inbox as ${gmailDupe.name} (${gmailDupe.email}) once dots and aliases are ignored.`,
    };
  }

  await prisma.user.update({ where: { id: userId }, data: { email } });

  revalidatePath(`/admin/workers/${userId}`);
}

export type UpdateWorkerOverloadState = { error?: string; ok?: boolean } | undefined;

// Set (or clear) a worker's personal overload threshold - how many jobs in a
// day flag them as overloaded on the schedule. Blank clears it back to the org
// default; otherwise a whole number clamped 1..50. Admin + org-scoped.
export async function updateWorkerOverloadAction(
  userId: string,
  _prevState: UpdateWorkerOverloadState,
  formData: FormData
): Promise<UpdateWorkerOverloadState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: { id: true },
  });
  if (!target) return { error: "Worker not found" };

  const raw = ((formData.get("threshold") as string | null) ?? "").trim();
  let value: number | null;
  if (!raw) {
    value = null;
  } else {
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      return { error: "Enter a whole number of 1 or more." };
    }
    value = Math.min(50, n);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { scheduleOverloadThreshold: value },
  });

  revalidatePath(`/admin/workers/${userId}`);
  return { ok: true };
}

export type UpdateWorkerRoleState = { error?: string } | undefined;

export async function updateWorkerRoleAction(
  userId: string,
  _prevState: UpdateWorkerRoleState,
  formData: FormData
): Promise<UpdateWorkerRoleState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const parsed = updateWorkerRoleSchema.safeParse({
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
  if (!user) return { error: "Worker not found" };
  if (user.role === parsed.data.role) return;

  // Same "last active admin" backstop as deactivation - the UI hides this
  // option too, so this only bites on a race or a repeated form post.
  if (
    user.active &&
    user.role === "ADMIN" &&
    parsed.data.role !== "ADMIN" &&
    (await isLastActiveAdmin(userId, organizationId))
  ) {
    return {
      error:
        "Can't demote the last active admin. Promote another worker to admin first.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: parsed.data.role },
  });

  // Audit trail: record who changed whose role, and from/to. Denormalizes the
  // names so the log survives an account deletion. Best-effort.
  try {
    await prisma.roleChangeEvent.create({
      data: {
        organizationId,
        targetId: user.id,
        targetName: user.name,
        actorId: session.user.id,
        actorName: session.user.name?.trim() || "—",
        fromRole: user.role,
        toRole: parsed.data.role,
      },
    });
  } catch {
    /* audit is best-effort; never block the role change */
  }

  revalidatePath(`/admin/workers/${userId}`);
  revalidatePath("/admin/workers");
  revalidatePath("/admin/settings/audit");
}
