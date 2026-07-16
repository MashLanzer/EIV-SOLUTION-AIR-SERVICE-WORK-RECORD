"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { requirePermission } from "@/lib/authz";
import { canAccessJob, timeWindowsOverlap } from "@/lib/schedule";
import { SCHEDULED_JOB_STATUSES, scheduledJobSchema } from "@/lib/validations";

export type ScheduleFormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
      ok?: boolean;
      // A non-blocking heads-up (e.g. the worker is double-booked). The job is
      // still saved; the UI just surfaces the warning.
      warning?: string;
    }
  | undefined;

const SCHEDULE_PATH = "/admin/schedule";
const WORKER_SCHEDULE_PATH = "/records/schedule";

function parse(formData: FormData) {
  return scheduledJobSchema.safeParse({
    title: formData.get("title"),
    scheduledFor: formData.get("scheduledFor"),
    startTime: formData.get("startTime") || "",
    endTime: formData.get("endTime") || "",
    requiredSkill: formData.get("requiredSkill") || "",
    notes: formData.get("notes") || "",
  });
}

// Resolve an optional related id from the form, but only when it belongs to the
// caller's org - a bad or cross-tenant id becomes null instead of leaking.
async function resolveWorkerId(formData: FormData, organizationId: string) {
  const raw = (formData.get("assignedToId") as string | null)?.trim();
  if (!raw) return null;
  const user = await prisma.user.findFirst({
    where: { id: raw, organizationId, active: true },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function resolveTeamId(formData: FormData, organizationId: string) {
  const raw = (formData.get("teamId") as string | null)?.trim();
  if (!raw) return null;
  const team = await prisma.team.findFirst({
    where: { id: raw, organizationId },
    select: { id: true },
  });
  return team?.id ?? null;
}

async function resolveCustomerId(formData: FormData, organizationId: string) {
  const raw = (formData.get("customerId") as string | null)?.trim();
  if (!raw) return null;
  const customer = await prisma.customer.findFirst({
    where: { id: raw, organizationId },
    select: { id: true },
  });
  return customer?.id ?? null;
}

async function resolveProjectId(formData: FormData, organizationId: string) {
  const raw = (formData.get("projectId") as string | null)?.trim();
  if (!raw) return null;
  const project = await prisma.project.findFirst({
    where: { id: raw, organizationId },
    select: { id: true },
  });
  return project?.id ?? null;
}

// A DATE column wants a UTC-midnight Date; the form sends "YYYY-MM-DD".
function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

// Warn (never block) when the assigned worker already has an overlapping timed
// job that day. Returns a warning string or null.
async function conflictWarning(params: {
  organizationId: string;
  assignedToId: string | null;
  scheduledFor: Date;
  startTime: string;
  endTime: string;
  ignoreJobId?: string;
}): Promise<string | null> {
  const { organizationId, assignedToId, scheduledFor, startTime, endTime, ignoreJobId } = params;
  if (!assignedToId || !startTime) return null;
  const sameDay = await prisma.scheduledJob.findMany({
    where: {
      organizationId,
      assignedToId,
      scheduledFor,
      status: { not: "CANCELED" },
      ...(ignoreJobId ? { id: { not: ignoreJobId } } : {}),
    },
    select: { startTime: true, endTime: true },
  });
  const clash = sameDay.some((j) =>
    timeWindowsOverlap(startTime, endTime || null, j.startTime, j.endTime)
  );
  return clash ? "conflict" : null;
}

export async function createScheduledJobAction(
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);

  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { title, scheduledFor, startTime, endTime, requiredSkill, notes } = parsed.data;
  const assignedToId = await resolveWorkerId(formData, organizationId);
  const teamId = await resolveTeamId(formData, organizationId);
  const customerId = await resolveCustomerId(formData, organizationId);
  const projectId = await resolveProjectId(formData, organizationId);
  const date = toDateOnly(scheduledFor);

  await prisma.scheduledJob.create({
    data: {
      organizationId,
      title,
      notes: notes || null,
      scheduledFor: date,
      startTime: startTime || null,
      endTime: endTime || null,
      requiredSkill: requiredSkill || null,
      assignedToId,
      teamId,
      customerId,
      projectId,
      createdById: session.user.id,
    },
  });

  const warning = await conflictWarning({
    organizationId,
    assignedToId,
    scheduledFor: date,
    startTime: startTime || "",
    endTime: endTime || "",
  });

  revalidatePath(SCHEDULE_PATH);
  revalidatePath(WORKER_SCHEDULE_PATH);
  return { ok: true, warning: warning ?? undefined };
}

export async function updateScheduledJobAction(
  jobId: string,
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);

  const owned = await prisma.scheduledJob.findFirst({
    where: { id: jobId, organizationId },
    select: { id: true },
  });
  if (!owned) return { error: "Job not found" };

  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { title, scheduledFor, startTime, endTime, requiredSkill, notes } = parsed.data;
  const assignedToId = await resolveWorkerId(formData, organizationId);
  const teamId = await resolveTeamId(formData, organizationId);
  const customerId = await resolveCustomerId(formData, organizationId);
  const projectId = await resolveProjectId(formData, organizationId);
  const date = toDateOnly(scheduledFor);

  await prisma.scheduledJob.update({
    where: { id: jobId },
    data: {
      title,
      notes: notes || null,
      scheduledFor: date,
      startTime: startTime || null,
      endTime: endTime || null,
      requiredSkill: requiredSkill || null,
      assignedToId,
      teamId,
      customerId,
      projectId,
    },
  });

  const warning = await conflictWarning({
    organizationId,
    assignedToId,
    scheduledFor: date,
    startTime: startTime || "",
    endTime: endTime || "",
    ignoreJobId: jobId,
  });

  revalidatePath(SCHEDULE_PATH);
  revalidatePath(WORKER_SCHEDULE_PATH);
  return { ok: true, warning: warning ?? undefined };
}

// Quick move to another day (drag/drop or a date picker). Org-scoped
// updateMany so a bad/cross-tenant id is a silent no-op.
export async function rescheduleJobAction(jobId: string, dateStr: string) {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
  await prisma.scheduledJob.updateMany({
    where: { id: jobId, organizationId },
    data: { scheduledFor: toDateOnly(dateStr) },
  });
  revalidatePath(SCHEDULE_PATH);
  revalidatePath(WORKER_SCHEDULE_PATH);
}

// Quick reassign to another worker (drag/drop). Empty string unassigns. The
// target worker must be an active member of the caller's org, so a bad or
// cross-tenant id can't stick a job on someone else's crew.
export async function reassignJobAction(jobId: string, workerId: string) {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);

  let assignedToId: string | null = null;
  if (workerId) {
    const worker = await prisma.user.findFirst({
      where: { id: workerId, organizationId, active: true },
      select: { id: true },
    });
    if (!worker) return;
    assignedToId = worker.id;
  }

  await prisma.scheduledJob.updateMany({
    where: { id: jobId, organizationId },
    data: { assignedToId },
  });
  revalidatePath(SCHEDULE_PATH);
  revalidatePath(WORKER_SCHEDULE_PATH);
}

// Status change. Admins can set any status on any job; a worker only on a job
// assigned to them or their team (to start/finish/cancel their own visit).
export async function setJobStatusAction(jobId: string, status: string) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const parsed = z.enum(SCHEDULED_JOB_STATUSES).safeParse(status);
  if (!parsed.success) return;
  if (!(await canAccessJob(session, jobId, organizationId))) return;

  // Only record history when the status actually changes, so repeated taps
  // don't clutter the trail.
  const current = await prisma.scheduledJob.findFirst({
    where: { id: jobId, organizationId },
    select: { status: true },
  });
  if (!current) return;

  await prisma.scheduledJob.updateMany({
    where: { id: jobId, organizationId },
    data: { status: parsed.data },
  });

  if (current.status !== parsed.data) {
    await prisma.jobStatusEvent.create({
      data: {
        jobId,
        status: parsed.data,
        actorId: session.user.id,
        actorName: session.user.name || "—",
      },
    });
  }

  revalidatePath(SCHEDULE_PATH);
  revalidatePath(WORKER_SCHEDULE_PATH);
}

export async function deleteScheduledJobAction(jobId: string) {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);
  await prisma.scheduledJob.deleteMany({ where: { id: jobId, organizationId } });
  revalidatePath(SCHEDULE_PATH);
  revalidatePath(WORKER_SCHEDULE_PATH);
}
