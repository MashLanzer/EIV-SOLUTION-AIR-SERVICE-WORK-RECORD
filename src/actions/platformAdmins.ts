"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { normalizeEmailForDuplicateCheck } from "@/lib/email";
import { sendEmail, emailLayout, appUrl } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";

const emailSchema = z.string().trim().email();

export type AdminActionState = { ok?: boolean; error?: string };

// Best-effort welcome/notify email to a granted admin. No-ops silently if the
// email provider isn't configured (see sendEmail).
async function notifyGrantedAdmin(email: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "You've been granted platform access — AeroTrack",
    html: emailLayout(
      "Platform access granted",
      [
        "You've been added as a platform admin on AeroTrack.",
        "Sign in with this Google account to open the platform console and manage companies.",
      ],
      { href: appUrl("/super"), label: "Open platform console" }
    ),
  });
}

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
  const existing = await prisma.platformAdmin.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  if (existing) return { error: "That email is already a platform admin." };

  await prisma.platformAdmin.create({
    data: { email: normalized, invitedBy: actorEmail },
  });

  await logAudit({
    organizationId: null,
    actor: { id: null, name: actorEmail },
    action: "platform.admin.add",
    entityType: "platform_admin",
    entityId: normalized,
    summary: `Granted platform admin access to ${normalized}`,
    isPlatform: true,
  });

  await notifyGrantedAdmin(normalized);

  revalidatePath("/super/admins");
  revalidatePath("/super/audit");
  return { ok: true };
}

// Resend the access notification to a granted admin. Env owners only.
export async function notifyPlatformAdminAction(id: string): Promise<void> {
  const { isOwner } = await requireSuperAdmin();
  if (!isOwner) return;
  const admin = await prisma.platformAdmin.findUnique({
    where: { id },
    select: { email: true },
  });
  if (!admin) return;
  await notifyGrantedAdmin(admin.email);
}

// Revoke a DB-granted admin. Env owners only; env-allowlist owners can't be
// removed here (they live in the Vercel env var).
export async function removePlatformAdminAction(id: string): Promise<void> {
  const { email: actorEmail, isOwner } = await requireSuperAdmin();
  if (!isOwner) return;
  const admin = await prisma.platformAdmin.findUnique({
    where: { id },
    select: { email: true },
  });
  await prisma.platformAdmin.delete({ where: { id } }).catch(() => {});

  if (admin) {
    await logAudit({
      organizationId: null,
      actor: { id: null, name: actorEmail },
      action: "platform.admin.remove",
      entityType: "platform_admin",
      entityId: admin.email,
      summary: `Revoked platform admin access from ${admin.email}`,
      isPlatform: true,
    });
  }

  revalidatePath("/super/admins");
  revalidatePath("/super/audit");
}
