"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/superAdmin";

// Flag a company to "watch" from the console, with an optional reason. A pure
// platform signal (never shown to the tenant): the company surfaces in the
// Needs-attention panel and carries a flag in the list until unwatched.
export async function watchOrgAction(orgId: string, formData: FormData): Promise<void> {
  const { email } = await requireSuperAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return;

  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  await prisma.organization.update({
    where: { id: org.id },
    data: { watchedAt: new Date(), watchNote: note, watchedBy: email },
  });

  await logAudit({
    organizationId: org.id,
    actor: { id: null, name: `Platform (${email})` },
    action: "platform.watch.on",
    entityType: "organization",
    entityId: org.id,
    summary: `Platform flagged ${org.name} to watch${note ? ` — ${note}` : ""}`,
    isPlatform: true,
  });

  revalidatePath(`/super/orgs/${org.id}`);
  revalidatePath("/super");
  revalidatePath("/super/orgs");
}

// Clear the watch flag.
export async function unwatchOrgAction(orgId: string): Promise<void> {
  const { email } = await requireSuperAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, watchedAt: true },
  });
  if (!org || !org.watchedAt) return;

  await prisma.organization.update({
    where: { id: org.id },
    data: { watchedAt: null, watchNote: null, watchedBy: null },
  });

  await logAudit({
    organizationId: org.id,
    actor: { id: null, name: `Platform (${email})` },
    action: "platform.watch.off",
    entityType: "organization",
    entityId: org.id,
    summary: `Platform cleared the watch flag on ${org.name}`,
    isPlatform: true,
  });

  revalidatePath(`/super/orgs/${org.id}`);
  revalidatePath("/super");
  revalidatePath("/super/orgs");
}
