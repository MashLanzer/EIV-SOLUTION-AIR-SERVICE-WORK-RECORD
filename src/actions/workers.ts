"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeEmailForDuplicateCheck } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import {
  createWorkerSchema,
  updateWorkerEmailSchema,
  updateWorkerRoleSchema,
} from "@/lib/validations";

export type WorkerFormState = { error?: string } | undefined;

// True if `userId` is currently the only active admin - demoting or
// deactivating them would leave nobody able to manage the admin tools.
async function isLastActiveAdmin(userId: string) {
  const otherActiveAdmins = await prisma.user.count({
    where: { role: "ADMIN", active: true, id: { not: userId } },
  });
  return otherActiveAdmins === 0;
}

// Catches a Gmail dot/alias variant of an email that's already authorized
// under a different, exact spelling (e.g. "j.doe@gmail.com" vs
// "jdoe@gmail.com" are the same inbox). The user table is small enough that
// scanning it here is cheaper than maintaining a normalized column.
async function findGmailDuplicate(email: string, excludeUserId?: string) {
  const normalized = normalizeEmailForDuplicateCheck(email);
  const users = await prisma.user.findMany({
    where: excludeUserId ? { id: { not: excludeUserId } } : undefined,
    select: { id: true, name: true, email: true },
  });
  return users.find((u) => normalizeEmailForDuplicateCheck(u.email) === normalized);
}

export async function createWorkerAction(
  _prevState: WorkerFormState,
  formData: FormData
): Promise<WorkerFormState> {
  await requireAdmin();

  const parsed = createWorkerSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "That email is already authorized" };
  }
  const gmailDupe = await findGmailDuplicate(email);
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
    },
  });

  revalidatePath("/admin/workers");
  redirect(`/admin/workers/${user.id}`);
}

export async function toggleWorkerActiveAction(userId: string) {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  // The UI already hides the Deactivate control for the last active admin;
  // this is the server-side backstop against races or repeated form posts.
  if (user.active && user.role === "ADMIN" && (await isLastActiveAdmin(userId))) {
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

export type UpdateWorkerEmailState = { error?: string } | undefined;

export async function updateWorkerEmailAction(
  userId: string,
  _prevState: UpdateWorkerEmailState,
  formData: FormData
): Promise<UpdateWorkerEmailState> {
  await requireAdmin();

  const parsed = updateWorkerEmailSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    return { error: "That email is already authorized" };
  }
  const gmailDupe = await findGmailDuplicate(email, userId);
  if (gmailDupe) {
    return {
      error: `That's the same Gmail inbox as ${gmailDupe.name} (${gmailDupe.email}) once dots and aliases are ignored.`,
    };
  }

  await prisma.user.update({ where: { id: userId }, data: { email } });

  revalidatePath(`/admin/workers/${userId}`);
}

export type UpdateWorkerRoleState = { error?: string } | undefined;

export async function updateWorkerRoleAction(
  userId: string,
  _prevState: UpdateWorkerRoleState,
  formData: FormData
): Promise<UpdateWorkerRoleState> {
  await requireAdmin();

  const parsed = updateWorkerRoleSchema.safeParse({
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Worker not found" };
  if (user.role === parsed.data.role) return;

  // Same "last active admin" backstop as deactivation - the UI hides this
  // option too, so this only bites on a race or a repeated form post.
  if (
    user.active &&
    user.role === "ADMIN" &&
    parsed.data.role === "WORKER" &&
    (await isLastActiveAdmin(userId))
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

  revalidatePath(`/admin/workers/${userId}`);
  revalidatePath("/admin/workers");
}
