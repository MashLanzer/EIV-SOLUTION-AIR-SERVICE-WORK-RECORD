"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/session";
import { workRecordSchema } from "@/lib/validations";

export type RecordFormState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

function parseRecordForm(formData: FormData) {
  return workRecordSchema.safeParse({
    date: formData.get("date"),
    jobNumber: formData.get("jobNumber"),
    leadInstallerName: formData.get("leadInstallerName"),
    helperName: formData.get("helperName") || undefined,
    customerName: formData.get("customerName"),
    customerAddress: formData.get("customerAddress"),
    arrivalTime: formData.get("arrivalTime"),
    departureTime: formData.get("departureTime"),
    typeOfWork: formData.get("typeOfWork"),
    workPerformedNotes: formData.get("workPerformedNotes"),
    leadInstallerPay: formData.get("leadInstallerPay"),
    helperPay: formData.get("helperPay") || undefined,
    customerSignature: formData.get("customerSignature"),
    installerSignature: formData.get("installerSignature"),
    photos: formData
      .getAll("photos")
      .filter((v): v is string => typeof v === "string" && v.length > 0),
  });
}

// Find-or-create the customer for a record, case-insensitively on
// name+address (a raw unique index enforces this at the DB level).
async function upsertCustomerId(name: string, address: string) {
  const match = {
    name: { equals: name, mode: "insensitive" as const },
    address: { equals: address, mode: "insensitive" as const },
  };
  const existing = await prisma.customer.findFirst({ where: match });
  if (existing) return existing.id;
  try {
    const created = await prisma.customer.create({ data: { name, address } });
    return created.id;
  } catch {
    // Unique-index race with a concurrent submission - fetch the winner.
    const winner = await prisma.customer.findFirst({ where: match });
    if (winner) return winner.id;
    throw new Error("Failed to save customer");
  }
}

export async function createRecordAction(
  _prevState: RecordFormState,
  formData: FormData
): Promise<RecordFormState> {
  const session = await requireAuth();

  const parsed = parseRecordForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  const customerId = await upsertCustomerId(data.customerName, data.customerAddress);
  await prisma.workRecord.create({
    data: {
      customerId,
      date: new Date(data.date),
      jobNumber: data.jobNumber,
      leadInstallerName: data.leadInstallerName,
      helperName: data.helperName || null,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      arrivalTime: data.arrivalTime,
      departureTime: data.departureTime,
      typeOfWork: data.typeOfWork,
      workPerformedNotes: data.workPerformedNotes,
      leadInstallerPay: data.leadInstallerPay,
      helperPay: data.helperPay === "" || data.helperPay == null ? null : data.helperPay,
      customerSignature: data.customerSignature,
      installerSignature: data.installerSignature,
      submittedById: session.user.id,
      photos: data.photos?.length
        ? {
            create: data.photos.map((dataUrl, position) => ({
              dataUrl,
              position,
            })),
          }
        : undefined,
    },
  });

  revalidatePath("/records");
  redirect("/records?saved=1");
}

export async function updateRecordAction(
  recordId: string,
  _prevState: RecordFormState,
  formData: FormData
): Promise<RecordFormState> {
  const session = await requireAuth();

  const record = await prisma.workRecord.findUnique({ where: { id: recordId } });
  if (!record) return { error: "Record not found" };
  if (session.user.role !== "ADMIN" && record.submittedById !== session.user.id) {
    return { error: "You do not have permission to edit this record" };
  }

  const parsed = parseRecordForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  const customerId = await upsertCustomerId(data.customerName, data.customerAddress);
  await prisma.workRecord.update({
    where: { id: recordId },
    data: {
      customerId,
      date: new Date(data.date),
      jobNumber: data.jobNumber,
      leadInstallerName: data.leadInstallerName,
      helperName: data.helperName || null,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      arrivalTime: data.arrivalTime,
      departureTime: data.departureTime,
      typeOfWork: data.typeOfWork,
      workPerformedNotes: data.workPerformedNotes,
      leadInstallerPay: data.leadInstallerPay,
      helperPay: data.helperPay === "" || data.helperPay == null ? null : data.helperPay,
      customerSignature: data.customerSignature,
      installerSignature: data.installerSignature,
      // The form always posts the record's current photo set, so a full
      // replace keeps order and removals correct.
      photos: {
        deleteMany: {},
        create: (data.photos ?? []).map((dataUrl, position) => ({
          dataUrl,
          position,
        })),
      },
    },
  });

  revalidatePath("/records");
  revalidatePath("/admin/records");
  redirect(
    session.user.role === "ADMIN"
      ? `/admin/records/${recordId}?saved=1`
      : `/records/${recordId}?saved=1`
  );
}

export async function deleteRecordAction(recordId: string) {
  await requireAdmin();
  await prisma.workRecord.delete({ where: { id: recordId } });
  revalidatePath("/admin/records");
  redirect("/admin/records");
}

export async function approveRecordAction(recordId: string) {
  await requireAdmin();
  await prisma.workRecord.update({
    where: { id: recordId },
    data: { status: "APPROVED" },
  });
  revalidatePath("/admin/records");
  revalidatePath(`/admin/records/${recordId}`);
  revalidatePath("/admin");
}
