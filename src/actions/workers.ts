"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { createWorkerSchema } from "@/lib/validations";

export type WorkerFormState = { error?: string } | undefined;

export async function createWorkerAction(
  _prevState: WorkerFormState,
  formData: FormData
): Promise<WorkerFormState> {
  await requireAdmin();

  const parsed = createWorkerSchema.safeParse({
    username: formData.get("username"),
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const username = parsed.data.username.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: "That username is already taken" };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      username,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
      mustChangePassword: true,
    },
  });

  revalidatePath("/admin/workers");
  redirect(`/admin/workers/${user.id}?tempPassword=${encodeURIComponent(tempPassword)}`);
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

export async function resetWorkerPasswordAction(userId: string) {
  await requireAdmin();

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });

  revalidatePath(`/admin/workers/${userId}`);
  redirect(`/admin/workers/${userId}?tempPassword=${encodeURIComponent(tempPassword)}`);
}
