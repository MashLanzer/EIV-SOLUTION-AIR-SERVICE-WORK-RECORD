"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { updateProfileNameSchema, updateProfilePhoneSchema, saveStoredSignatureSchema } from "@/lib/validations";

export type ProfileFormState = { error?: string; ok?: boolean } | undefined;

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

  revalidatePath("/records/profile");
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

  revalidatePath("/records/profile");
  return { ok: true };
}

export async function clearStoredSignatureAction(): Promise<ProfileFormState> {
  const session = await requireAuth();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { storedSignature: null },
  });

  revalidatePath("/records/profile");
  return { ok: true };
}
