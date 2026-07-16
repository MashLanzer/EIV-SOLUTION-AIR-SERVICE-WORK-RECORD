"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { addSkillSchema } from "@/lib/validations";

export type OrgSkillState = { error?: string; ok?: boolean } | undefined;

// The catalog feeds autocomplete on the profile, the workers list and the
// scheduler's required-skill field, so a change refreshes all of them.
function revalidateSkills() {
  revalidatePath("/admin/settings/skills");
  revalidatePath("/admin/schedule");
  revalidatePath("/records/schedule");
  revalidatePath("/admin/profile");
  revalidatePath("/records/profile");
}

// Add a skill to the org's catalog (admin only).
export async function createOrgSkillAction(
  _prev: OrgSkillState,
  formData: FormData
): Promise<OrgSkillState> {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  const parsed = addSkillSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.orgSkill.create({
      data: { organizationId, name: parsed.data.name },
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return { error: "That skill is already in the catalog." };
    }
    return { error: "Couldn't add the skill." };
  }

  revalidateSkills();
  return { ok: true };
}

// Remove a skill from the catalog (admin only, org-scoped).
export async function deleteOrgSkillAction(skillId: string): Promise<OrgSkillState> {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  await prisma.orgSkill.deleteMany({ where: { id: skillId, organizationId } });

  revalidateSkills();
  return { ok: true };
}
