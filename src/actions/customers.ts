"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
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
  await requireAdmin();

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
  await requireAdmin();
  const targetId = (formData.get("targetId") as string | null)?.trim();
  if (!targetId || targetId === sourceId) {
    redirect(`/admin/customers/${sourceId}?error=merge`);
  }

  // Guard against a stale option (target deleted/merged elsewhere between
  // page load and submit) before moving records and deleting the source.
  const target = await prisma.customer.findUnique({ where: { id: targetId } });
  if (!target) {
    redirect(`/admin/customers/${sourceId}?error=merge`);
  }

  await prisma.$transaction([
    prisma.workRecord.updateMany({
      where: { customerId: sourceId },
      data: { customerId: targetId },
    }),
    prisma.customer.delete({ where: { id: sourceId } }),
  ]);

  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${targetId}?merged=1`);
}

export async function deleteCustomerAction(customerId: string) {
  await requireAdmin();
  // Records keep their denormalized name/address; the FK is set null.
  await prisma.customer.delete({ where: { id: customerId } });
  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}
