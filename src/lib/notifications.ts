import { prisma } from "@/lib/prisma";
import { appUrl, emailLayout, sendEmail } from "@/lib/email";

// Workflow email notifications. Every function looks up what it needs by
// record id and is fully best-effort (the sender swallows errors), so a
// notification can never break the save/approve/return action that fired it.

// Admins of a specific company only - never notify one company's admins
// about another company's record.
async function activeAdminEmails(organizationId: string | null): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { organizationId, role: "ADMIN", active: true },
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
      organizationId: true,
      submittedBy: { select: { name: true } },
    },
  });
  if (!record) return;
  const emails = await activeAdminEmails(record.organizationId);
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

// --- Schedule notifications -> the assigned worker ---

const jobDateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// A scheduled job was created / assigned / moved -> email the assigned worker so
// they know what's on their plan without opening the app. Best-effort and a
// no-op when the job has no assigned worker (or is canceled).
export async function notifyWorkerJobScheduled(
  jobId: string,
  kind: "scheduled" | "reassigned" | "rescheduled"
): Promise<void> {
  const job = await prisma.scheduledJob.findUnique({
    where: { id: jobId },
    select: {
      title: true,
      scheduledFor: true,
      startTime: true,
      endTime: true,
      status: true,
      assignedTo: { select: { email: true } },
      customer: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  const email = job?.assignedTo?.email;
  if (!job || !email || job.status === "CANCELED") return;

  const dateLabel = jobDateFmt.format(job.scheduledFor);
  const timeLabel = job.startTime
    ? job.endTime
      ? `${job.startTime}–${job.endTime}`
      : job.startTime
    : "All day";
  const where = job.project?.name ?? job.customer?.name ?? "";
  const heading =
    kind === "reassigned"
      ? "A job was assigned to you"
      : kind === "rescheduled"
        ? "A scheduled job was moved"
        : "You have a new scheduled job";
  const title = job.title || "Scheduled job";
  await sendEmail({
    to: email,
    subject: `${title} — ${dateLabel}`,
    html: emailLayout(
      heading,
      [
        `<strong>${title}</strong>`,
        `${dateLabel} · ${timeLabel}${where ? ` · ${where}` : ""}`,
      ],
      { href: appUrl("/records/schedule"), label: "Open your schedule" }
    ),
  });
}

// A whole recurring series was created for a worker -> one summary email rather
// than one per occurrence.
export async function notifyWorkerSeriesScheduled(
  workerId: string,
  title: string,
  firstDate: Date,
  count: number
): Promise<void> {
  const worker = await prisma.user.findUnique({
    where: { id: workerId },
    select: { email: true },
  });
  const email = worker?.email;
  if (!email) return;
  const jobTitle = title || "Scheduled job";
  await sendEmail({
    to: email,
    subject: `${jobTitle} — ${count} visits scheduled`,
    html: emailLayout(
      "You have a recurring job scheduled",
      [
        `<strong>${jobTitle}</strong>`,
        `${count} visits, starting ${jobDateFmt.format(firstDate)}.`,
      ],
      { href: appUrl("/records/schedule"), label: "Open your schedule" }
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
