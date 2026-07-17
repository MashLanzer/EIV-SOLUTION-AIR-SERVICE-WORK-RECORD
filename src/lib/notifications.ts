import { prisma } from "@/lib/prisma";
import { appUrl, emailLayout, sendEmail } from "@/lib/email";
import { createNotifications } from "@/lib/inappNotify";

// Workflow notifications. Every function looks up what it needs by record id
// and is fully best-effort (both the email sender and the in-app writer swallow
// errors), so a notification can never break the save/approve/return action
// that fired it. Each sends an email AND writes a matching in-app notification
// (the header bell) for the same recipient, with the actor and full detail.

// An actor is whoever caused the notification (the approver, the person who
// scheduled the job, ...). Threaded in from the action so the card can say who.
type Actor = { id: string; name?: string | null } | null | undefined;

// Admins of a specific company only - never notify one company's admins about
// another company's record. Returns id + email so the same set drives both the
// email (by address) and the in-app notification (by user id).
async function activeAdmins(
  organizationId: string | null
): Promise<{ id: string; email: string | null }[]> {
  return prisma.user.findMany({
    where: { organizationId, role: "ADMIN", active: true },
    select: { id: true, email: true },
  });
}

// Company-wide notification switches (Settings → Notifications). A missing org
// or column falls back to "on", so notifications only stop when explicitly
// turned off. Best-effort like everything else here.
async function orgNotifyEnabled(
  organizationId: string | null,
  flag: "notifyOnSubmit" | "notifyOnReview" | "notifyReminders"
): Promise<boolean> {
  if (!organizationId) return true;
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { notifyOnSubmit: true, notifyOnReview: true, notifyReminders: true },
    });
    return org ? org[flag] : true;
  } catch {
    return true;
  }
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
      submittedById: true,
      submittedBy: { select: { name: true } },
    },
  });
  if (!record) return;
  if (!(await orgNotifyEnabled(record.organizationId, "notifyOnSubmit"))) return;
  const admins = await activeAdmins(record.organizationId);
  if (admins.length === 0) return;

  const who = record.submittedBy?.name ?? "A worker";
  const action =
    kind === "new" ? "submitted a new record" : "resubmitted a record";
  const emails = admins.map((a) => a.email).filter((e): e is string => Boolean(e));
  if (emails.length > 0) {
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

  await createNotifications({
    organizationId: record.organizationId!,
    userIds: admins.map((a) => a.id),
    category: "COMPANY",
    type: kind === "new" ? "record_submitted" : "record_resubmitted",
    title:
      kind === "new" ? "New record for review" : "Record resubmitted for review",
    body: `#${record.jobNumber} · ${record.customerName}`,
    actorId: record.submittedById,
    actorName: record.submittedBy?.name ?? null,
    href: `/admin/records/${recordId}`,
  });
}

// Admin returned a record for changes -> the worker who submitted it.
export async function notifyWorkerReturned(recordId: string, actor?: Actor): Promise<void> {
  const record = await prisma.workRecord.findUnique({
    where: { id: recordId },
    select: {
      jobNumber: true,
      customerName: true,
      reviewNote: true,
      organizationId: true,
      submittedById: true,
      submittedBy: { select: { email: true } },
    },
  });
  if (!record) return;
  if (!(await orgNotifyEnabled(record.organizationId, "notifyOnReview"))) return;
  const email = record.submittedBy?.email;

  if (email) {
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

  await createNotifications({
    organizationId: record.organizationId!,
    userIds: [record.submittedById],
    category: "PERSONAL",
    type: "record_returned",
    title: "Your record needs changes",
    body: record.reviewNote?.trim()
      ? `#${record.jobNumber} · ${record.reviewNote.trim()}`
      : `#${record.jobNumber} · ${record.customerName}`,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    href: `/records/${recordId}/edit`,
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
  kind: "scheduled" | "reassigned" | "rescheduled",
  actor?: Actor
): Promise<void> {
  const job = await prisma.scheduledJob.findUnique({
    where: { id: jobId },
    select: {
      title: true,
      scheduledFor: true,
      startTime: true,
      endTime: true,
      status: true,
      organizationId: true,
      assignedToId: true,
      assignedTo: { select: { email: true } },
      customer: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  if (!job || !job.assignedToId || job.status === "CANCELED") return;
  if (!(await orgNotifyEnabled(job.organizationId, "notifyReminders"))) return;

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
  const email = job.assignedTo?.email;
  if (email) {
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

  await createNotifications({
    organizationId: job.organizationId,
    userIds: [job.assignedToId],
    category: "PERSONAL",
    type:
      kind === "reassigned"
        ? "job_reassigned"
        : kind === "rescheduled"
          ? "job_rescheduled"
          : "job_scheduled",
    title: heading,
    body: `${title} · ${dateLabel} · ${timeLabel}${where ? ` · ${where}` : ""}`,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    href: "/records/schedule",
  });
}

// A whole recurring series was created for a worker -> one summary email rather
// than one per occurrence.
export async function notifyWorkerSeriesScheduled(
  workerId: string,
  title: string,
  firstDate: Date,
  count: number,
  actor?: Actor
): Promise<void> {
  const worker = await prisma.user.findUnique({
    where: { id: workerId },
    select: { email: true, organizationId: true },
  });
  if (!worker) return;
  if (!(await orgNotifyEnabled(worker.organizationId, "notifyReminders"))) return;
  const jobTitle = title || "Scheduled job";
  const startLabel = jobDateFmt.format(firstDate);
  if (worker.email) {
    await sendEmail({
      to: worker.email,
      subject: `${jobTitle} — ${count} visits scheduled`,
      html: emailLayout(
        "You have a recurring job scheduled",
        [
          `<strong>${jobTitle}</strong>`,
          `${count} visits, starting ${startLabel}.`,
        ],
        { href: appUrl("/records/schedule"), label: "Open your schedule" }
      ),
    });
  }

  if (worker.organizationId) {
    await createNotifications({
      organizationId: worker.organizationId,
      userIds: [workerId],
      category: "PERSONAL",
      type: "job_series",
      title: "You have a recurring job scheduled",
      body: `${jobTitle} · ${count} visits, starting ${startLabel}`,
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      href: "/records/schedule",
    });
  }
}

const dayMonthFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// The office registered time off for someone -> tell that person (in-app only;
// time off has no email path). Personal notification, so it reaches whatever
// role the recipient is. Skips notifying someone about their own entry.
export async function notifyWorkerTimeOff(timeOffId: string, actor?: Actor): Promise<void> {
  const row = await prisma.timeOff.findUnique({
    where: { id: timeOffId },
    select: {
      userId: true,
      organizationId: true,
      startDate: true,
      endDate: true,
      reason: true,
    },
  });
  if (!row || row.userId === actor?.id) return;

  const startLabel = dayMonthFmt.format(row.startDate);
  const endLabel = dayMonthFmt.format(row.endDate);
  const range =
    row.startDate.getTime() === row.endDate.getTime()
      ? startLabel
      : `${startLabel} – ${endLabel}`;
  await createNotifications({
    organizationId: row.organizationId,
    userIds: [row.userId],
    category: "PERSONAL",
    type: "time_off_added",
    title: "Time off was added for you",
    body: row.reason?.trim() ? `${range} · ${row.reason.trim()}` : range,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    href: "/records/schedule",
  });
}

// A worker requested time off from their profile -> the office (admins), so
// someone can approve or deny it from the schedule.
export async function notifyOfficeTimeOffRequest(timeOffId: string): Promise<void> {
  const row = await prisma.timeOff.findUnique({
    where: { id: timeOffId },
    select: {
      organizationId: true,
      startDate: true,
      endDate: true,
      reason: true,
      user: { select: { id: true, name: true } },
    },
  });
  if (!row) return;
  const admins = await activeAdmins(row.organizationId);
  if (admins.length === 0) return;

  const startLabel = dayMonthFmt.format(row.startDate);
  const endLabel = dayMonthFmt.format(row.endDate);
  const range =
    row.startDate.getTime() === row.endDate.getTime()
      ? startLabel
      : `${startLabel} – ${endLabel}`;
  const who = row.user?.name ?? "A worker";

  const emails = admins.map((a) => a.email).filter((e): e is string => Boolean(e));
  if (emails.length > 0) {
    await sendEmail({
      to: emails,
      subject: `Time off request from ${who}`,
      html: emailLayout(
        "Time off request",
        [
          `${who} requested time off for <strong>${range}</strong>.`,
          row.reason?.trim() ? `Reason: ${row.reason.trim()}` : "No reason given.",
          "Approve or deny it from the schedule.",
        ],
        { href: appUrl("/admin/schedule?timeoff=1"), label: "Review request" }
      ),
    });
  }

  await createNotifications({
    organizationId: row.organizationId,
    userIds: admins.map((a) => a.id),
    category: "COMPANY",
    type: "time_off_requested",
    title: "Time off request",
    body: row.reason?.trim() ? `${who} · ${range} · ${row.reason.trim()}` : `${who} · ${range}`,
    actorId: row.user?.id ?? null,
    actorName: row.user?.name ?? null,
    href: "/admin/schedule?timeoff=1",
  });
}

// The office approved or denied a worker's request -> the requester.
export async function notifyWorkerTimeOffDecision(
  timeOffId: string,
  approved: boolean,
  actor?: Actor
): Promise<void> {
  const row = await prisma.timeOff.findUnique({
    where: { id: timeOffId },
    select: {
      userId: true,
      organizationId: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!row) return;

  const startLabel = dayMonthFmt.format(row.startDate);
  const endLabel = dayMonthFmt.format(row.endDate);
  const range =
    row.startDate.getTime() === row.endDate.getTime()
      ? startLabel
      : `${startLabel} – ${endLabel}`;
  await createNotifications({
    organizationId: row.organizationId,
    userIds: [row.userId],
    category: "PERSONAL",
    type: approved ? "time_off_approved" : "time_off_denied",
    title: approved ? "Time off approved" : "Time off request denied",
    body: range,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    href: "/records/profile",
  });
}

// Someone commented on a photo -> tell whoever took it (in-app only; photo
// comments have no email path to avoid a back-and-forth email storm). Personal
// notification, so it reaches the owner whatever their role. Skips notifying a
// commenter about their own comment, and no-ops when the photo has no owner.
export async function notifyPhotoOwnerOfComment(
  photoId: string,
  commentBody: string,
  actor?: Actor
): Promise<void> {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      organizationId: true,
      projectId: true,
      takenById: true,
      takenBy: { select: { role: true } },
      project: { select: { name: true } },
    },
  });
  if (!photo?.takenById || photo.takenById === actor?.id) return;

  // Owner's own area for the deep link (admins view under /admin).
  const area = photo.takenBy?.role === "ADMIN" ? "admin" : "records";
  const excerpt = commentBody.trim().replace(/\s+/g, " ").slice(0, 100);
  await createNotifications({
    organizationId: photo.organizationId,
    userIds: [photo.takenById],
    category: "PERSONAL",
    type: "photo_comment",
    title: "New comment on your photo",
    body: photo.project?.name ? `${photo.project.name} · ${excerpt}` : excerpt,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    href: `/${area}/projects/${photo.projectId}/photos/${photoId}`,
  });
}

// The crew marked a job "on the way" -> let the customer know a technician is
// heading over. Best-effort; a no-op when the job has no customer email.
export async function notifyCustomerOnTheWay(jobId: string): Promise<void> {
  const job = await prisma.scheduledJob.findUnique({
    where: { id: jobId },
    select: {
      title: true,
      startTime: true,
      customer: { select: { name: true, email: true } },
      organization: { select: { name: true } },
    },
  });
  const email = job?.customer?.email;
  if (!job || !email) return;
  const company = job.organization?.name ?? "Your service team";
  const when = job.startTime ? ` around ${job.startTime}` : " shortly";
  await sendEmail({
    to: email,
    subject: `${company} is on the way`,
    html: emailLayout(`Your technician is on the way`, [
      `Hi ${job.customer?.name ?? "there"},`,
      `${company} is heading to your location${when} for <strong>${job.title || "your scheduled service"}</strong>.`,
    ]),
  });
}

// Admin approved a record -> the worker who submitted it.
export async function notifyWorkerApproved(recordId: string, actor?: Actor): Promise<void> {
  const record = await prisma.workRecord.findUnique({
    where: { id: recordId },
    select: {
      jobNumber: true,
      customerName: true,
      organizationId: true,
      submittedById: true,
      submittedBy: { select: { email: true } },
    },
  });
  if (!record) return;
  if (!(await orgNotifyEnabled(record.organizationId, "notifyOnReview"))) return;
  const email = record.submittedBy?.email;

  if (email) {
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

  await createNotifications({
    organizationId: record.organizationId!,
    userIds: [record.submittedById],
    category: "PERSONAL",
    type: "record_approved",
    title: "Your record was approved",
    body: `#${record.jobNumber} · ${record.customerName}`,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? null,
    href: `/records/${recordId}`,
  });
}
