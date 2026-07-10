"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { customerSchema } from "@/lib/validations";

export type CustomerFormState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function updateCustomerAction(
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const session = await requireAdmin();
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
  const session = await requireAdmin();
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

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${targetId}?merged=1`);
}

export async function deleteCustomerAction(customerId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  // Records keep their denormalized name/address; the FK is set null.
  // deleteMany with the org filter is a no-op if the customer isn't in the
  // caller's org, so an admin can never delete another company's customer.
  await prisma.customer.deleteMany({ where: { id: customerId, organizationId } });
  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}
