"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { deleteProjectPhoto } from "@/lib/blob";
import {
  notifyAdminsRecordForReview,
  notifyWorkerApproved,
  notifyWorkerReturned,
} from "@/lib/notifications";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin, requireAuth } from "@/lib/session";
import { scheduleWhereForUser, schedulePaths } from "@/lib/schedule";
import { workRecordSchema } from "@/lib/validations";

// When a record is filed from a scheduled job, close the loop: link the two
// and mark the job done. Scope-safe (updateMany over the caller's own jobs) so
// a forged jobId can't touch someone else's plan. Best-effort - a bad id is a
// silent no-op and never blocks the record from saving.
async function linkScheduledJob(
  session: Awaited<ReturnType<typeof requireAuth>>,
  organizationId: string,
  jobId: string,
  workRecordId: string
) {
  const scope = await scheduleWhereForUser(session, organizationId);
  await prisma.scheduledJob.updateMany({
    where: { AND: [{ id: jobId, workRecordId: null }, scope] },
    data: { workRecordId, status: "DONE" },
  });
  for (const path of schedulePaths()) revalidatePath(path);
}

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

// The picked project, but only if it belongs to the caller's org (so a
// crafted projectId can't attach a record to another company's project).
async function resolveProjectId(
  formData: FormData,
  organizationId: string
): Promise<string | null> {
  const raw = (formData.get("projectId") as string | null)?.trim();
  if (!raw) return null;
  const project = await prisma.project.findFirst({
    where: { id: raw, organizationId },
    select: { id: true },
  });
  return project?.id ?? null;
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

// Company required-field policies (Settings) enforced on submit: photo,
// helper name and customer signature. Returns a field-error state to surface
// on the offending step, or undefined when everything passes.
async function checkRecordPolicies(
  organizationId: string,
  data: { photos?: string[]; helperName?: string; customerSignature?: string }
): Promise<RecordFormState> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      requirePhoto: true,
      requireHelper: true,
      requireCustomerSignature: true,
    },
  });
  if (!org) return undefined;

  const fieldErrors: Record<string, string[]> = {};
  if (org.requirePhoto && !data.photos?.length) {
    fieldErrors.photos = ["Your company requires at least one photo on every record."];
  }
  if (org.requireHelper && !data.helperName?.trim()) {
    fieldErrors.helperName = ["Your company requires a helper on every record."];
  }
  if (org.requireCustomerSignature && !data.customerSignature?.trim()) {
    fieldErrors.customerSignature = ["The customer's signature is required."];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }
  return undefined;
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

  const policyError = await checkRecordPolicies(organizationId, data);
  if (policyError) return policyError;

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
  const projectId = await resolveProjectId(formData, organizationId);
  const created = await prisma.workRecord.create({
    data: {
      customerId,
      organizationId,
      projectId,
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

  const jobId = (formData.get("jobId") as string | null)?.trim();
  if (jobId) await linkScheduledJob(session, organizationId, jobId, created.id);

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
  // Approved records are always locked to workers. Admins can still amend
  // them unless the company turned on the "lock approved records" policy, in
  // which case an approved record must be reopened before anyone can edit it.
  if (record.status === "APPROVED") {
    if (!isAdmin) {
      return { error: "This record was approved and can no longer be edited." };
    }
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { lockApprovedRecords: true },
    });
    if (org?.lockApprovedRecords) {
      return {
        error:
          "Approved records are locked. Return this record to Needs changes before editing it.",
      };
    }
  }

  const parsed = parseRecordForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const data = parsed.data;

  const policyError = await checkRecordPolicies(organizationId, data);
  if (policyError) return policyError;

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
  const projectId = await resolveProjectId(formData, organizationId);
  await prisma.workRecord.update({
    where: { id: recordId },
    data: {
      projectId,
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

// Turn on the public customer receipt: mint an unguessable token (idempotent -
// keeps an existing one) so the link stays stable. Admin + org-scoped.
export async function shareRecordAction(recordId: string): Promise<{ token: string } | null> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const record = await prisma.workRecord.findFirst({
    where: { id: recordId, organizationId },
    select: { publicToken: true },
  });
  if (!record) return null;

  let token = record.publicToken;
  if (!token) {
    token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
    await prisma.workRecord.update({ where: { id: recordId }, data: { publicToken: token } });
    revalidatePath(`/admin/records/${recordId}`);
  }
  return { token };
}

// Stop sharing: clear the token so the public link 404s.
export async function unshareRecordAction(recordId: string): Promise<void> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  await prisma.workRecord.updateMany({
    where: { id: recordId, organizationId },
    data: { publicToken: null },
  });
  revalidatePath(`/admin/records/${recordId}`);
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

// Bulk approve: only records still SUBMITTED (org-scoped) flip to APPROVED, so
// selecting an already-approved row is a harmless no-op. Returns how many were
// actually approved for the caller's toast.
export async function bulkApproveRecordsAction(
  ids: string[]
): Promise<{ count: number }> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const clean = [...new Set(ids.filter(Boolean))];
  if (clean.length === 0) return { count: 0 };

  const pending = await prisma.workRecord.findMany({
    where: { id: { in: clean }, organizationId, status: "SUBMITTED" },
    select: { id: true },
  });
  const targetIds = pending.map((p) => p.id);
  if (targetIds.length === 0) return { count: 0 };

  await prisma.workRecord.updateMany({
    where: { id: { in: targetIds }, organizationId, status: "SUBMITTED" },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById: session.user.id,
      reviewNote: null,
    },
  });
  for (const id of targetIds) await notifyWorkerApproved(id);
  revalidatePath("/admin/records");
  revalidatePath("/admin");
  revalidatePath("/records");
  return { count: targetIds.length };
}

// Bulk return: send the selected SUBMITTED records back with one shared note.
export async function bulkRequestChangesAction(
  ids: string[],
  note: string
): Promise<{ count: number }> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const clean = [...new Set(ids.filter(Boolean))];
  const trimmed = note.trim();
  if (clean.length === 0 || !trimmed) return { count: 0 };

  const pending = await prisma.workRecord.findMany({
    where: { id: { in: clean }, organizationId, status: "SUBMITTED" },
    select: { id: true },
  });
  const targetIds = pending.map((p) => p.id);
  if (targetIds.length === 0) return { count: 0 };

  await prisma.workRecord.updateMany({
    where: { id: { in: targetIds }, organizationId, status: "SUBMITTED" },
    data: {
      status: "NEEDS_CHANGES",
      reviewNote: trimmed,
      approvedAt: null,
      approvedById: null,
    },
  });
  for (const id of targetIds) await notifyWorkerReturned(id);
  revalidatePath("/admin/records");
  revalidatePath("/admin");
  revalidatePath("/records");
  return { count: targetIds.length };
}

// Danger zone: wipe every work record - and, via ON DELETE CASCADE, its
// photos - to hand the app back "like new". Customers and user accounts
// (workers/admins) are deliberately kept. Admin-only, and double-gated: the
// caller must type the exact confirmation phrase, re-checked here so a
// stray/forged request can't trigger it.
// Test/reset button (hidden behind the 7-tap reveal). Wipes ALL of the
// company's content - records, customers, projects, photos (+blobs), teams,
// checklists, templates, tags, comments - so the app can be re-tested from
// scratch. User accounts and the Organization itself are kept, so the admin
// stays signed in. Strictly org-scoped: never touches another company.
export async function resetHistoryAction(formData: FormData) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const confirm = (formData.get("confirm") as string | null)?.trim();
  if (confirm !== "RESET") {
    redirect("/admin/settings");
  }

  // Delete the blobs first (network, best-effort) before dropping the rows
  // that point at them.
  const photos = await prisma.photo.findMany({
    where: { organizationId },
    select: { url: true },
  });
  await Promise.all(
    photos.map((p) => deleteProjectPhoto(p.url).catch(() => {}))
  );

  // Delete referencing rows before referenced ones; remaining FKs are
  // Cascade/SetNull. Users and the Organization are intentionally untouched.
  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { organizationId } }),
    prisma.photoTag.deleteMany({ where: { photo: { organizationId } } }),
    prisma.checklistItem.deleteMany({ where: { checklist: { organizationId } } }),
    prisma.checklist.deleteMany({ where: { organizationId } }),
    prisma.checklistTemplateItem.deleteMany({
      where: { template: { organizationId } },
    }),
    prisma.checklistTemplate.deleteMany({ where: { organizationId } }),
    prisma.photo.deleteMany({ where: { organizationId } }),
    prisma.tag.deleteMany({ where: { organizationId } }),
    prisma.workPhoto.deleteMany({ where: { record: { organizationId } } }),
    prisma.workRecord.deleteMany({ where: { organizationId } }),
    prisma.teamMembership.deleteMany({ where: { team: { organizationId } } }),
    prisma.team.deleteMany({ where: { organizationId } }),
    prisma.project.deleteMany({ where: { organizationId } }),
    prisma.customer.deleteMany({ where: { organizationId } }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/records");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/photos");
  revalidatePath("/admin/teams");
  revalidatePath("/records");
  revalidatePath("/records/projects");
  redirect("/admin/settings?reset=1");
}
