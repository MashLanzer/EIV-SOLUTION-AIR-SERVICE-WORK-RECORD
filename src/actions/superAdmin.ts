"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { generateJoinCode } from "@/lib/joinCode";
import { requireSuperAdmin } from "@/lib/superAdmin";

export type SuperFormState = { error?: string } | undefined;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "company"
  );
}

const nameSchema = z.string().trim().min(1, "A name is required").max(120, "Name is too long");

// Platform-owner audit: record against the target org so the trail shows up in
// that company's own audit log, attributed to the super-admin's email.
async function superAudit(
  organizationId: string,
  email: string,
  action: string,
  summary: string
) {
  await logAudit({
    organizationId,
    actor: { id: null, name: `Platform (${email})` },
    action,
    entityType: "organization",
    entityId: organizationId,
    summary,
    isPlatform: true,
  });
}

export async function createOrgAction(
  _prev: SuperFormState,
  formData: FormData
): Promise<SuperFormState> {
  const { email } = await requireSuperAdmin();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
  const name = parsed.data;

  let created: { id: string } | null = null;
  for (let attempt = 0; attempt < 4 && !created; attempt++) {
    const slug =
      attempt === 0 ? slugify(name) : `${slugify(name)}-${generateJoinCode(4).toLowerCase()}`;
    try {
      created = await prisma.organization.create({
        data: { name, slug, joinCode: generateJoinCode() },
        select: { id: true },
      });
    } catch {
      // slug/joinCode collision — retry with a suffixed slug + fresh code.
    }
  }
  if (!created) return { error: "Could not create the company. Try a different name." };

  await superAudit(created.id, email, "organization.create", `Created company ${name}`);
  redirect(`/super/orgs/${created.id}`);
}

export async function renameOrgAction(
  orgId: string,
  _prev: SuperFormState,
  formData: FormData
): Promise<SuperFormState> {
  const { email } = await requireSuperAdmin();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid name" };

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) return { error: "Company not found." };

  await prisma.organization.update({ where: { id: orgId }, data: { name: parsed.data } });
  await superAudit(orgId, email, "organization.rename", `Renamed company to ${parsed.data}`);
  revalidatePath(`/super/orgs/${orgId}`);
  revalidatePath("/super/orgs");
  return undefined;
}

export async function setOrgActiveAction(orgId: string, active: boolean) {
  const { email } = await requireSuperAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });
  if (!org) return;

  await prisma.organization.update({
    where: { id: orgId },
    data: { active, suspendedAt: active ? null : new Date() },
  });
  await superAudit(
    orgId,
    email,
    active ? "organization.reactivate" : "organization.suspend",
    active ? `Reactivated company ${org.name}` : `Suspended company ${org.name}`
  );
  revalidatePath(`/super/orgs/${orgId}`);
  revalidatePath("/super/orgs");
}

export async function regenerateJoinCodeAction(orgId: string) {
  const { email } = await requireSuperAdmin();
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  if (!org) return;

  // Retry on the tiny chance of a unique-code collision.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await prisma.organization.update({
        where: { id: orgId },
        data: { joinCode: generateJoinCode() },
      });
      break;
    } catch {
      // collision — try a new code
    }
  }
  await superAudit(orgId, email, "organization.joincode", `Regenerated join code for ${org.name}`);
  revalidatePath(`/super/orgs/${orgId}`);
}

// Hard delete cascades to every child row (users, records, invoices, …), so it
// requires the company to be suspended first — the same "must be inactive to
// delete" guard used for workers. Irreversible.
export async function deleteOrgAction(orgId: string) {
  await requireSuperAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { active: true },
  });
  if (!org || org.active) return; // must suspend before deleting
  await prisma.organization.delete({ where: { id: orgId } });
  revalidatePath("/super/orgs");
  redirect("/super/orgs");
}
