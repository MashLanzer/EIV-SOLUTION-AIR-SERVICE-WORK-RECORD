"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/superAdmin";

export type ReminderActionState = { ok?: boolean; error?: string };

const schema = z.object({
  note: z.string().trim().min(1, "What should you follow up on?").max(300),
  // A yyyy-mm-dd date from the date input.
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date."),
});

// Set a dated follow-up on a company. The due date is interpreted at end of day
// UTC so a reminder due "today" stays actionable through the day.
export async function addOrgReminderAction(
  orgId: string,
  _prev: ReminderActionState,
  formData: FormData
): Promise<ReminderActionState> {
  const { email } = await requireSuperAdmin();

  const parsed = schema.safeParse({ note: formData.get("note"), due: formData.get("due") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid reminder." };

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return { error: "Company not found." };

  const dueAt = new Date(`${parsed.data.due}T23:59:59.000Z`);
  if (Number.isNaN(dueAt.getTime())) return { error: "Pick a valid due date." };

  await prisma.orgReminder.create({
    data: { organizationId: org.id, createdBy: email, note: parsed.data.note, dueAt },
  });

  await logAudit({
    organizationId: org.id,
    actor: { id: null, name: `Platform (${email})` },
    action: "platform.reminder.add",
    entityType: "organization",
    entityId: org.id,
    summary: `Platform set a follow-up on ${org.name} for ${parsed.data.due}`,
    isPlatform: true,
  });

  revalidatePath(`/super/orgs/${org.id}`);
  revalidatePath("/super");
  return { ok: true };
}

// Push a follow-up's due date out by N days ("snooze"). Measured from the later
// of now or the current due date, so snoozing an overdue item lands in the
// future rather than still in the past.
export async function snoozeOrgReminderAction(reminderId: string, days: number): Promise<void> {
  await requireSuperAdmin();
  const allowed = [1, 3, 7];
  if (!allowed.includes(days)) return;

  const reminder = await prisma.orgReminder.findUnique({
    where: { id: reminderId },
    select: { id: true, organizationId: true, dueAt: true, doneAt: true },
  });
  if (!reminder || reminder.doneAt) return;

  const base = reminder.dueAt.getTime() > Date.now() ? reminder.dueAt : new Date();
  const next = new Date(base.getTime() + days * 86400000);
  next.setUTCHours(23, 59, 59, 0);

  await prisma.orgReminder.update({ where: { id: reminder.id }, data: { dueAt: next } });
  revalidatePath(`/super/orgs/${reminder.organizationId}`);
  revalidatePath("/super");
}

// Mark a follow-up done (clears it from the due list). Toggling back is a
// delete-and-recreate concern; done is one-way here for simplicity.
export async function completeOrgReminderAction(reminderId: string): Promise<void> {
  await requireSuperAdmin();
  const reminder = await prisma.orgReminder.findUnique({
    where: { id: reminderId },
    select: { id: true, organizationId: true, doneAt: true },
  });
  if (!reminder || reminder.doneAt) return;
  await prisma.orgReminder.update({ where: { id: reminder.id }, data: { doneAt: new Date() } });
  revalidatePath(`/super/orgs/${reminder.organizationId}`);
  revalidatePath("/super");
}

// Remove a follow-up entirely.
export async function deleteOrgReminderAction(reminderId: string): Promise<void> {
  await requireSuperAdmin();
  const reminder = await prisma.orgReminder.findUnique({
    where: { id: reminderId },
    select: { id: true, organizationId: true },
  });
  if (!reminder) return;
  await prisma.orgReminder.delete({ where: { id: reminder.id } }).catch(() => {});
  revalidatePath(`/super/orgs/${reminder.organizationId}`);
  revalidatePath("/super");
}
