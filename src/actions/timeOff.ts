"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { requirePermission } from "@/lib/authz";
import {
  notifyWorkerTimeOff,
  notifyOfficeTimeOffRequest,
  notifyWorkerTimeOffDecision,
} from "@/lib/notifications";
import { timeOffRequestSchema, timeOffSchema } from "@/lib/validations";

export type TimeOffFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean }
  | undefined;

const SCHEDULE_PATH = "/admin/schedule";
const WORKER_SCHEDULE_PATH = "/records/schedule";
const PROFILE_PATHS = ["/records/profile", "/admin/profile"];

function revalidateAll() {
  revalidatePath(SCHEDULE_PATH);
  revalidatePath(WORKER_SCHEDULE_PATH);
  for (const p of PROFILE_PATHS) revalidatePath(p);
}

// A DATE column wants a UTC-midnight Date; the form sends "YYYY-MM-DD".
function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

// Record a worker's day(s) off. Scheduler permission required (the office sets
// its crew's availability). The worker must be an active member of the caller's
// org, so a bad or cross-tenant id can't stick time off on someone else's crew.
export async function addTimeOffAction(
  _prev: TimeOffFormState,
  formData: FormData
): Promise<TimeOffFormState> {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);

  const parsed = timeOffSchema.safeParse({
    userId: formData.get("userId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || "",
  });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { userId, startDate, endDate, reason } = parsed.data;

  const worker = await prisma.user.findFirst({
    where: { id: userId, organizationId, active: true },
    select: { id: true },
  });
  if (!worker) return { error: "Worker not found", fieldErrors: { userId: ["Pick a worker"] } };

  const created = await prisma.timeOff.create({
    data: {
      organizationId,
      userId: worker.id,
      startDate: toDateOnly(startDate),
      endDate: toDateOnly(endDate),
      reason: reason || null,
      status: "APPROVED",
      createdById: session.user.id,
    },
    select: { id: true },
  });
  // Let the person know it's on their calendar (in-app; time off has no email).
  await notifyWorkerTimeOff(created.id, session.user);

  revalidateAll();
  return { ok: true };
}

// Remove a time-off entry. Org-scoped deleteMany so a bad/cross-tenant id is a
// silent no-op.
export async function deleteTimeOffAction(id: string) {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);
  await prisma.timeOff.deleteMany({ where: { id, organizationId } });
  revalidateAll();
}

// A worker requests their own time off from their profile. Any authenticated,
// active member of the org may ask; it lands as PENDING for the office to
// approve, so it doesn't mark them unavailable until then.
export async function requestTimeOffAction(
  _prev: TimeOffFormState,
  formData: FormData
): Promise<TimeOffFormState> {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const parsed = timeOffRequestSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || "",
  });
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { startDate, endDate, reason } = parsed.data;

  const created = await prisma.timeOff.create({
    data: {
      organizationId,
      userId: session.user.id,
      startDate: toDateOnly(startDate),
      endDate: toDateOnly(endDate),
      reason: reason || null,
      status: "PENDING",
      createdById: session.user.id,
    },
    select: { id: true },
  });
  await notifyOfficeTimeOffRequest(created.id);

  revalidateAll();
  return { ok: true };
}

// A worker withdraws their own still-pending request. Scoped to the requester
// and PENDING only, so it can't remove approved office entries or others'.
export async function cancelTimeOffRequestAction(id: string) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  await prisma.timeOff.deleteMany({
    where: { id, organizationId, userId: session.user.id, status: "PENDING" },
  });
  revalidateAll();
}

// The office approves or denies a pending request. Approving makes it count as
// real time off (marks the worker unavailable); denying keeps the record but
// inert. The office may adjust the dates before approving and leave a note
// (shown to the worker, e.g. why it was denied). Either way the worker is
// notified.
export async function reviewTimeOffAction(
  id: string,
  approve: boolean,
  opts?: { startDate?: string; endDate?: string; note?: string }
) {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);

  const data: {
    status: "APPROVED" | "DENIED";
    reviewedById: string;
    reviewedAt: Date;
    reviewNote: string | null;
    startDate?: Date;
    endDate?: Date;
  } = {
    status: approve ? "APPROVED" : "DENIED",
    reviewedById: session.user.id,
    reviewedAt: new Date(),
    reviewNote: opts?.note?.trim() ? opts.note.trim().slice(0, 200) : null,
  };
  // Only apply adjusted dates when approving, and only if both are valid and in
  // order. Ignore silently otherwise (the original request stands).
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (
    approve &&
    opts?.startDate &&
    opts?.endDate &&
    dateRe.test(opts.startDate) &&
    dateRe.test(opts.endDate) &&
    opts.endDate >= opts.startDate
  ) {
    data.startDate = toDateOnly(opts.startDate);
    data.endDate = toDateOnly(opts.endDate);
  }

  const { count } = await prisma.timeOff.updateMany({
    where: { id, organizationId, status: "PENDING" },
    data,
  });
  if (count > 0) await notifyWorkerTimeOffDecision(id, approve, session.user);
  revalidateAll();
}
