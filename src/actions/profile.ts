"use server";

import { revalidatePath } from "next/cache";

import { deleteProjectPhoto, uploadUserAvatar } from "@/lib/blob";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { updateProfileNameSchema, updateProfilePhoneSchema, saveStoredSignatureSchema, addSkillSchema } from "@/lib/validations";

export type ProfileFormState = { error?: string; ok?: boolean } | undefined;

const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4 MB

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

// Upload (or replace) the signed-in user's profile photo.
export async function updateProfileAvatarAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await requireAuth();

  const file = formData.get("avatar");
  if (!(file instanceof Blob) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't an image." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Photo must be 4 MB or smaller." };
  }

  let url: string;
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { error: "Image storage isn't configured. Ask your provider to enable it." };
    }
    url = await uploadUserAvatar(session.user.id, file, file.type);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "unknown error";
    return { error: `Upload failed: ${detail}` };
  }

  const prev = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: url },
  });
  if (prev?.avatarUrl) await deleteProjectPhoto(prev.avatarUrl);

  revalidateProfile();
  return { ok: true };
}

export async function removeProfileAvatarAction(): Promise<ProfileFormState> {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });
  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: null },
  });
  if (user?.avatarUrl) await deleteProjectPhoto(user.avatarUrl);
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
