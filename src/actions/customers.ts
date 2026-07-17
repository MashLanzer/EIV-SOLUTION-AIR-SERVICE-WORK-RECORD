"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { customerSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { getOrgFeatures } from "@/lib/features";

export type CustomerFormState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

// Create a customer from scratch (the office pre-registering someone before a
// job, rather than waiting for the first record to spawn them). Uniqueness is
// enforced by a raw functional index UNIQUE(lower(name), lower(address)); a
// clash surfaces as a friendly message instead of a 500.
export async function createCustomerAction(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const session = await requirePermission("customers.manage");
  const organizationId = requireOrgId(session);

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
  });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { name, address, phone, email } = parsed.data;
  let created: { id: string };
  try {
    created = await prisma.customer.create({
      data: {
        organizationId,
        name,
        address,
        phone: phone ? phone : null,
        email: email ? email : null,
      },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "A customer with this name and address already exists." };
    }
    throw err;
  }

  await logAudit({
    organizationId,
    actor: { id: session.user.id, name: session.user.name },
    action: "customer.create",
    entityType: "customer",
    entityId: created.id,
    summary: `Added customer ${name}`,
  });
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${created.id}?saved=1`);
}

export async function updateCustomerAction(
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const session = await requirePermission("customers.manage");
  const organizationId = requireOrgId(session);

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
  });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  // The customer must belong to the caller's org before we touch it.
  const owned = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: { id: true },
  });
  if (!owned) return { error: "Customer not found" };

  const { name, address, phone, email } = parsed.data;
  // Off by default: existing records keep the customer name/address as it
  // was when they were submitted, since they can be signed/approved
  // paperwork - only touch them when the admin explicitly opts in.
  const applyToExistingRecords = formData.get("applyToExistingRecords") === "on";

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: {
        name,
        address,
        phone: phone ? phone : null,
        email: email ? email : null,
      },
    }),
    ...(applyToExistingRecords
      ? [
          prisma.workRecord.updateMany({
            where: { customerId },
            data: { customerName: name, customerAddress: address },
          }),
        ]
      : []),
  ]);

  await logAudit({
    organizationId,
    actor: { id: session.user.id, name: session.user.name },
    action: "customer.update",
    entityType: "customer",
    entityId: customerId,
    summary: `Edited customer ${name}`,
  });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  if (applyToExistingRecords) {
    revalidatePath("/admin/records");
    revalidatePath("/records");
  }
  redirect(`/admin/customers/${customerId}?saved=1`);
}

// Merge one customer into another: move all of the source's jobs to the
// target, then delete the now-empty source (dedupes accidental duplicates).
export async function mergeCustomerAction(
  sourceId: string,
  formData: FormData
) {
  const session = await requirePermission("customers.manage");
  const organizationId = requireOrgId(session);
  const targetId = (formData.get("targetId") as string | null)?.trim();
  if (!targetId || targetId === sourceId) {
    redirect(`/admin/customers/${sourceId}?error=merge`);
  }

  // Guard against a stale option (target deleted/merged elsewhere between
  // page load and submit) and ensure both customers are in the caller's org
  // before moving records and deleting the source.
  const [source, target] = await Promise.all([
    prisma.customer.findFirst({ where: { id: sourceId, organizationId }, select: { id: true } }),
    prisma.customer.findFirst({ where: { id: targetId, organizationId }, select: { id: true } }),
  ]);
  if (!source || !target) {
    redirect(`/admin/customers/${sourceId}?error=merge`);
  }

  await prisma.$transaction([
    prisma.workRecord.updateMany({
      where: { customerId: sourceId, organizationId },
      data: { customerId: targetId },
    }),
    prisma.customer.delete({ where: { id: sourceId } }),
  ]);

  await logAudit({
    organizationId,
    actor: { id: session.user.id, name: session.user.name },
    action: "customer.merge",
    entityType: "customer",
    entityId: targetId,
    summary: "Merged two customers",
  });
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${targetId}?merged=1`);
}

export async function deleteCustomerAction(customerId: string) {
  const session = await requirePermission("customers.manage");
  const organizationId = requireOrgId(session);
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: { name: true },
  });
  // Records keep their denormalized name/address; the FK is set null.
  // deleteMany with the org filter is a no-op if the customer isn't in the
  // caller's org, so an admin can never delete another company's customer.
  await prisma.customer.deleteMany({ where: { id: customerId, organizationId } });
  if (existing) {
    await logAudit({
      organizationId,
      actor: { id: session.user.id, name: session.user.name },
      action: "customer.delete",
      entityType: "customer",
      entityId: customerId,
      summary: `Deleted customer ${existing.name}`,
    });
  }
  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

// Generate (or reuse) the private portal link for a customer. Idempotent: if a
// token already exists we keep it so an already-shared link never breaks.
export async function shareCustomerPortalAction(
  customerId: string
): Promise<{ token: string } | undefined> {
  const session = await requirePermission("customers.manage");
  const organizationId = requireOrgId(session);
  // Portal module must be enabled for this company.
  if (!(await getOrgFeatures(organizationId)).portal) return undefined;
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: { portalToken: true, name: true },
  });
  if (!customer) return undefined;
  const token =
    customer.portalToken ??
    `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  await prisma.customer.update({ where: { id: customerId }, data: { portalToken: token } });
  await logAudit({
    organizationId,
    actor: { id: session.user.id, name: session.user.name },
    action: "customer.portal.share",
    entityType: "customer",
    entityId: customerId,
    summary: `Enabled portal link for ${customer.name}`,
  });
  revalidatePath(`/admin/customers/${customerId}`);
  return { token };
}

export async function unshareCustomerPortalAction(customerId: string): Promise<void> {
  const session = await requirePermission("customers.manage");
  const organizationId = requireOrgId(session);
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    select: { name: true },
  });
  await prisma.customer.updateMany({
    where: { id: customerId, organizationId },
    data: { portalToken: null },
  });
  if (customer) {
    await logAudit({
      organizationId,
      actor: { id: session.user.id, name: session.user.name },
      action: "customer.portal.unshare",
      entityType: "customer",
      entityId: customerId,
      summary: `Revoked portal link for ${customer.name}`,
    });
  }
  revalidatePath(`/admin/customers/${customerId}`);
}
