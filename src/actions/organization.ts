"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { generateJoinCode } from "@/lib/joinCode";
import { updateOrganizationNameSchema } from "@/lib/validations";

// Rotate the company's invite code (admin only). Anyone holding the old code
// can no longer join with it. Also (re)enables joining-by-code if it was off.
export async function rotateJoinCodeAction() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { joinCode: generateJoinCode() },
      });
      break;
    } catch {
      // Unique collision on the new code - try another.
    }
  }

  revalidatePath("/admin/settings");
}

// Turn joining-by-code on or off (admin only). Off clears the code entirely so
// no one can join with a link they saved; on mints a fresh code. This is the
// enable/disable half of the invite-code control (rotate handles refresh).
export async function setJoinCodeEnabledAction(enabled: boolean) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  if (!enabled) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { joinCode: null },
    });
    revalidatePath("/admin/settings");
    return;
  }

  // Enabling: only mint a code if there isn't one already, so toggling on when
  // it's already on is a no-op instead of silently rotating.
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { joinCode: true },
  });
  if (org?.joinCode) {
    revalidatePath("/admin/settings");
    return;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { joinCode: generateJoinCode() },
      });
      break;
    } catch {
      // Unique collision on the new code - try another.
    }
  }
  revalidatePath("/admin/settings");
}

export type OrganizationNameState = { error?: string; ok?: boolean } | undefined;

// Rename the company (admin only). The name is org-scoped and shows on the
// work-record PDF header, so this is a real, visible change.
export async function updateOrganizationNameAction(
  _prev: OrganizationNameState,
  formData: FormData
): Promise<OrganizationNameState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const parsed = updateOrganizationNameSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { name: parsed.data.name },
  });

  revalidatePath("/admin/settings");
  return { ok: true };
}
