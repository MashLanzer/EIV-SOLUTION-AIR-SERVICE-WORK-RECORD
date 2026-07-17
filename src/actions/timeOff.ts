"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { timeOffSchema } from "@/lib/validations";

export type TimeOffFormState =
  | { error?: string; fieldErrors?: Record<string, string[]>; ok?: boolean }
  | undefined;

const SCHEDULE_PATH = "/admin/schedule";
const WORKER_SCHEDULE_PATH = "/records/schedule";

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

  await prisma.timeOff.create({
    data: {
      organizationId,
      userId: worker.id,
      startDate: toDateOnly(startDate),
      endDate: toDateOnly(endDate),
      reason: reason || null,
      createdById: session.user.id,
    },
  });

  revalidatePath(SCHEDULE_PATH);
  revalidatePath(WORKER_SCHEDULE_PATH);
  return { ok: true };
}

// Remove a time-off entry. Org-scoped deleteMany so a bad/cross-tenant id is a
// silent no-op.
export async function deleteTimeOffAction(id: string) {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);
  await prisma.timeOff.deleteMany({ where: { id, organizationId } });
  revalidatePath(SCHEDULE_PATH);
  revalidatePath(WORKER_SCHEDULE_PATH);
}
