"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  notifyAdminsRecordForReview,
  notifyWorkerApproved,
  notifyWorkerReturned,
} from "@/lib/notifications";
import { requireOrgId } from "@/lib/orgScope";
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
// Optional phone/email are filled in when provided (kept if already set).
async function upsertCustomerId(
  name: string,
  address: string,
  phone?: string,
  email?: string,
  organizationId?: string | null
) {
  const match = {
    name: { equals: name, mode: "insensitive" as const },
    address: { equals: address, mode: "insensitive" as const },
    ...(organizationId ? { organizationId } : {}),
  };
  const contact = {
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
  };
  const existing = await prisma.customer.findFirst({ where: match });
  if (existing) {
    if (Object.keys(contact).length > 0) {
      await prisma.customer.update({ where: { id: existing.id }, data: contact });
    }
    return existing.id;
  }
  try {
    const created = await prisma.customer.create({
      data: { name, address, ...contact, organizationId: organizationId ?? undefined },
    });
    return created.id;
  } catch {
    // Unique-index race with a concurrent submission - fetch the winner.
    const winner = await prisma.customer.findFirst({ where: match });
    if (winner) return winner.id;
    throw new Error("Failed to save customer");
  }
}

// Optional customer contact fields ride along on the record form but live
// on the Customer, not the WorkRecord.
function parseCustomerContact(formData: FormData) {
  const phone = (formData.get("customerPhone") as string | null)?.trim() || undefined;
  const email =
    (formData.get("customerEmail") as string | null)?.trim().toLowerCase() ||
    undefined;
  return { phone, email };
}

// jobNumber has no DB-level uniqueness constraint (a hard @unique could fail
// to migrate against existing duplicate data), so this app-level check is
// the only thing stopping two records from silently sharing a job number.
async function findDuplicateJobNumber(
  jobNumber: string,
  organizationId: string,
  excludeRecordId?: string
) {
  return prisma.workRecord.findFirst({
    where: {
      organizationId,
      jobNumber: { equals: jobNumber.trim(), mode: "insensitive" },
      ...(excludeRecordId ? { NOT: { id: excludeRecordId } } : {}),
    },
    select: { customerName: true, date: true },
  });
}

function jobNumberTakenError(dup: { customerName: string; date: Date }): RecordFormState {
  return {
    error: "Please fix the highlighted fields.",
    fieldErrors: {
      jobNumber: [
        `Already used on a record for ${dup.customerName} (${dup.date.toISOString().slice(0, 10)}).`,
      ],
    },
  };
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

  const organizationId = requireOrgId(session);
  const data = parsed.data;
  const dupJobNumber = await findDuplicateJobNumber(data.jobNumber, organizationId);
  if (dupJobNumber) return jobNumberTakenError(dupJobNumber);

  const contact = parseCustomerContact(formData);
  const customerId = await upsertCustomerId(
    data.customerName,
    data.customerAddress,
    contact.phone,
    contact.email,
    organizationId
  );
  const created = await prisma.workRecord.create({
    data: {
      customerId,
      organizationId,
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
    select: { id: true },
  });

  await notifyAdminsRecordForReview(created.id, "new");

  revalidatePath("/records");
  redirect("/records?saved=1");
}

export async function updateRecordAction(
  recordId: string,
  _prevState: RecordFormState,
  formData: FormData
): Promise<RecordFormState> {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const record = await prisma.workRecord.findFirst({
    where: { id: recordId, organizationId },
  });
  if (!record) return { error: "Record not found" };
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && record.submittedById !== session.user.id) {
    return { error: "You do not have permission to edit this record" };
  }
  // Approved records are locked to workers; only an admin can still amend them.
  if (!isAdmin && record.status === "APPROVED") {
    return { error: "This record was approved and can no longer be edited." };
  }

  const parsed = parseRecordForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;
  const dupJobNumber = await findDuplicateJobNumber(data.jobNumber, organizationId, recordId);
  if (dupJobNumber) return jobNumberTakenError(dupJobNumber);

  const contact = parseCustomerContact(formData);
  const customerId = await upsertCustomerId(
    data.customerName,
    data.customerAddress,
    contact.phone,
    contact.email,
    organizationId
  );
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
      // A worker resubmitting (e.g. after "return for changes") sends the
      // record back into the review queue and clears the reviewer's note.
      // Admin edits leave the status/note untouched.
      ...(isAdmin ? {} : { status: "SUBMITTED", reviewNote: null }),
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

  // A worker resubmitting sends it back into the review queue - let the
  // admins know. Admin edits don't change the status, so no notice.
  if (!isAdmin) {
    await notifyAdminsRecordForReview(recordId, "resubmitted");
  }

  revalidatePath("/records");
  revalidatePath("/admin/records");
  redirect(
    session.user.role === "ADMIN"
      ? `/admin/records/${recordId}?saved=1`
      : `/records/${recordId}?saved=1`
  );
}

export async function deleteRecordAction(recordId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  // Org-scoped delete: a no-op if the record belongs to another company.
  await prisma.workRecord.deleteMany({ where: { id: recordId, organizationId } });
  revalidatePath("/admin/records");
  redirect("/admin/records");
}

export async function approveRecordAction(recordId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  await prisma.workRecord.updateMany({
    where: { id: recordId, organizationId },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById: session.user.id,
      reviewNote: null,
    },
  });
  await notifyWorkerApproved(recordId);
  revalidatePath("/admin/records");
  revalidatePath(`/admin/records/${recordId}`);
  revalidatePath("/admin");
}

// Send a record back to the worker with a note explaining what to fix.
export async function requestChangesAction(recordId: string, formData: FormData) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const note = (formData.get("reviewNote") as string | null)?.trim() || null;
  await prisma.workRecord.updateMany({
    where: { id: recordId, organizationId },
    data: {
      status: "NEEDS_CHANGES",
      reviewNote: note,
      approvedAt: null,
      approvedById: null,
    },
  });
  await notifyWorkerReturned(recordId);
  revalidatePath("/admin/records");
  revalidatePath(`/admin/records/${recordId}`);
  revalidatePath("/records");
  revalidatePath(`/records/${recordId}`);
  revalidatePath("/admin");
}

// Danger zone: wipe every work record - and, via ON DELETE CASCADE, its
// photos - to hand the app back "like new". Customers and user accounts
// (workers/admins) are deliberately kept. Admin-only, and double-gated: the
// caller must type the exact confirmation phrase, re-checked here so a
// stray/forged request can't trigger it.
export async function resetHistoryAction(formData: FormData) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const confirm = (formData.get("confirm") as string | null)?.trim();
  if (confirm !== "RESET") {
    redirect("/admin/settings");
  }
  await prisma.workRecord.deleteMany({ where: { organizationId } });
  revalidatePath("/admin");
  revalidatePath("/admin/records");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/customers");
  revalidatePath("/records");
  redirect("/admin/settings?reset=1");
}
