"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superAdmin";

export type SavedViewState = { ok?: boolean; error?: string };

const nameSchema = z.string().trim().min(1, "Name the view.").max(40);
// Canonical Companies searchParams only, so a saved view can't smuggle in
// arbitrary query keys. Kept permissive on values (validated on read anyway).
const ALLOWED_KEYS = new Set(["status", "plan", "sort", "watched", "view"]);

function sanitizeQuery(raw: string): string {
  const inParams = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const out = new URLSearchParams();
  for (const key of ["status", "plan", "sort", "watched", "view"]) {
    const v = inParams.get(key);
    if (v && ALLOWED_KEYS.has(key)) out.set(key, v.slice(0, 20));
  }
  return out.toString();
}

// Save the current Companies filter combination as a named quick-access chip.
export async function saveViewAction(
  query: string,
  _prev: SavedViewState,
  formData: FormData
): Promise<SavedViewState> {
  const { email } = await requireSuperAdmin();

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name." };

  const clean = sanitizeQuery(query);

  const count = await prisma.platformSavedView.count();
  if (count >= 30) return { error: "You've reached the saved-view limit (30)." };

  await prisma.platformSavedView.create({
    data: { name: parsed.data, query: clean, createdBy: email },
  });

  revalidatePath("/super/orgs");
  return { ok: true };
}

// Delete a saved view.
export async function deleteSavedViewAction(id: string): Promise<void> {
  await requireSuperAdmin();
  await prisma.platformSavedView.delete({ where: { id } }).catch(() => {});
  revalidatePath("/super/orgs");
}
