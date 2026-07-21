"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/superAdmin";

export type NoteActionState = { ok?: boolean; error?: string };

const bodySchema = z.string().trim().min(1, "Write something first.").max(2000);

// Pin a private, platform-only note to a company. Any platform admin (not just
// owners) can leave notes — they're an internal working memo, never shown to the
// company. Logged to the platform audit so note activity is traceable.
export async function addOrgNoteAction(
  orgId: string,
  _prev: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const { email } = await requireSuperAdmin();

  const parsed = bodySchema.safeParse(formData.get("body"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid note." };

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return { error: "Company not found." };

  await prisma.orgNote.create({
    data: { organizationId: org.id, authorEmail: email, body: parsed.data },
  });

  await logAudit({
    organizationId: org.id,
    actor: { id: null, name: `Platform (${email})` },
    action: "platform.note.add",
    entityType: "organization",
    entityId: org.id,
    summary: `Platform added an internal note on ${org.name}`,
    isPlatform: true,
  });

  revalidatePath(`/super/orgs/${org.id}`);
  return { ok: true };
}

// Remove an internal note. Any platform admin can delete (the console is a
// shared owner surface); scoped by id, revalidates the company page.
export async function deleteOrgNoteAction(noteId: string): Promise<void> {
  await requireSuperAdmin();
  const note = await prisma.orgNote.findUnique({
    where: { id: noteId },
    select: { id: true, organizationId: true },
  });
  if (!note) return;
  await prisma.orgNote.delete({ where: { id: note.id } }).catch(() => {});
  revalidatePath(`/super/orgs/${note.organizationId}`);
}
