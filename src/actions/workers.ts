"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { createWorkerSchema, updateWorkerEmailSchema } from "@/lib/validations";

export type WorkerFormState = { error?: string } | undefined;

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

  await prisma.user.update({ where: { id: userId }, data: { email } });

  revalidatePath(`/admin/workers/${userId}`);
}
