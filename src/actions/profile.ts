"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { updateProfileNameSchema, updateProfilePhoneSchema, saveStoredSignatureSchema, addSkillSchema } from "@/lib/validations";

export type ProfileFormState = { error?: string; ok?: boolean } | undefined;

// The profile screen is served at two routes (worker and admin); both must be
// revalidated after a change or the admin view goes stale.
function revalidateProfile() {
  revalidatePath("/records/profile");
  revalidatePath("/admin/profile");
}

// Update the signed-in user's own display name. The name lives on the User row
// (the auth callback reads it from the DB on every request, not from Google),
// so this persists everywhere it's shown: submitted-by, comments, team lists.
export async function updateProfileNameAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await requireAuth();

  const parsed = updateProfileNameSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/records/settings");
  return { ok: true };
}

export async function updateProfilePhoneAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await requireAuth();

  const parsed = updateProfilePhoneSchema.safeParse({
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { phone: parsed.data.phone || null },
  });

  revalidateProfile();
  return { ok: true };
}

export async function saveStoredSignatureAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await requireAuth();

  const parsed = saveStoredSignatureSchema.safeParse({
    signature: formData.get("signature"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { storedSignature: parsed.data.signature },
  });

  revalidateProfile();
  return { ok: true };
}

export async function clearStoredSignatureAction(): Promise<ProfileFormState> {
  const session = await requireAuth();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { storedSignature: null },
  });

  revalidateProfile();
  return { ok: true };
}

export async function addSkillAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await requireAuth();

  const parsed = addSkillSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await prisma.userSkill.create({
      data: { userId: session.user.id, name: parsed.data.name },
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return { error: "You already have this skill." };
    }
    return { error: "Failed to save skill." };
  }

  revalidateProfile();
  return { ok: true };
}

export async function removeSkillAction(skillId: string): Promise<ProfileFormState> {
  const session = await requireAuth();

  await prisma.userSkill.deleteMany({
    where: { id: skillId, userId: session.user.id },
  });

  revalidateProfile();
  return { ok: true };
}
