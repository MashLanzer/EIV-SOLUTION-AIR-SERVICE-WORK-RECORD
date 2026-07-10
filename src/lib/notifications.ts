import { prisma } from "@/lib/prisma";
import { appUrl, emailLayout, sendEmail } from "@/lib/email";

// Workflow email notifications. Every function looks up what it needs by
// record id and is fully best-effort (the sender swallows errors), so a
// notification can never break the save/approve/return action that fired it.

async function activeAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true },
    select: { email: true },
  });
  return admins.map((a) => a.email).filter((e): e is string => Boolean(e));
}

// New record submitted, or a worker resubmitted after changes -> admins.
export async function notifyAdminsRecordForReview(
  recordId: string,
  kind: "new" | "resubmitted"
): Promise<void> {
  const record = await prisma.workRecord.findUnique({
    where: { id: recordId },
    select: {
      jobNumber: true,
      customerName: true,
      submittedBy: { select: { name: true } },
    },
  });
  if (!record) return;
  const emails = await activeAdminEmails();
  if (emails.length === 0) return;

  const who = record.submittedBy?.name ?? "A worker";
  const action =
    kind === "new" ? "submitted a new record" : "resubmitted a record";
  await sendEmail({
    to: emails,
    subject: `Job #${record.jobNumber} ${kind === "new" ? "submitted" : "resubmitted"} for review`,
    html: emailLayout(
      `Record ready for review`,
      [
        `${who} ${action} for <strong>${record.customerName}</strong>.`,
        `Job #${record.jobNumber} is waiting for your review.`,
      ],
      { href: appUrl(`/admin/records/${recordId}`), label: "Review record" }
    ),
  });
}

// Admin returned a record for changes -> the worker who submitted it.
export async function notifyWorkerReturned(recordId: string): Promise<void> {
  const record = await prisma.workRecord.findUnique({
    where: { id: recordId },
    select: {
      jobNumber: true,
      reviewNote: true,
      submittedBy: { select: { email: true } },
    },
  });
  const email = record?.submittedBy?.email;
  if (!record || !email) return;

  await sendEmail({
    to: email,
    subject: `Job #${record.jobNumber} was returned for changes`,
    html: emailLayout(
      `Your record needs changes`,
      [
        `Your supervisor returned Job #${record.jobNumber} for changes.`,
        record.reviewNote
          ? `Note: <em>${record.reviewNote}</em>`
          : `Open the record to see what needs fixing, then resubmit.`,
      ],
      { href: appUrl(`/records/${recordId}/edit`), label: "Fix and resubmit" }
    ),
  });
}

// Admin approved a record -> the worker who submitted it.
export async function notifyWorkerApproved(recordId: string): Promise<void> {
  const record = await prisma.workRecord.findUnique({
    where: { id: recordId },
    select: {
      jobNumber: true,
      submittedBy: { select: { email: true } },
    },
  });
  const email = record?.submittedBy?.email;
  if (!record || !email) return;

  await sendEmail({
    to: email,
    subject: `Job #${record.jobNumber} was approved`,
    html: emailLayout(
      `Your record was approved`,
      [`Job #${record.jobNumber} has been approved. Nice work!`],
      { href: appUrl(`/records/${recordId}`), label: "View record" }
    ),
  });
}
