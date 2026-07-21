"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { normalizeEmailForDuplicateCheck } from "@/lib/email";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";

const emailSchema = z.string().trim().email();

export type AdminActionState = { ok?: boolean; error?: string };

// Grant platform-console access to an email. Env-allowlist owners only: a
// DB-granted admin has console access but can never add more admins, so the
// power to create platform admins stays anchored to the Vercel env var.
export async function addPlatformAdminAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const { email: actorEmail, isOwner } = await requireSuperAdmin();
  if (!isOwner) return { error: "Only platform owners can add admins." };

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };

  const normalized = normalizeEmailForDuplicateCheck(parsed.data);
  if (isSuperAdminEmail(normalized)) {
    return { error: "That email is already an owner (from the environment)." };
  }

  await prisma.platformAdmin.upsert({
    where: { email: normalized },
    update: {},
    create: { email: normalized, invitedBy: actorEmail },
  });

  revalidatePath("/super/admins");
  return { ok: true };
}

// Revoke a DB-granted admin. Env owners only; env-allowlist owners can't be
// removed here (they live in the Vercel env var).
export async function removePlatformAdminAction(id: string): Promise<void> {
  const { isOwner } = await requireSuperAdmin();
  if (!isOwner) return;
  await prisma.platformAdmin.delete({ where: { id } }).catch(() => {});
  revalidatePath("/super/admins");
}
