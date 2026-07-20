"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";

const MAX_NOTE = 300;

// Parse "YYYY-MM-DD" as UTC midnight; fall back to today when unparseable.
function parseDate(raw: string | null): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Log a mileage entry for the signed-in worker. Own entries only.
export async function addMileageAction(formData: FormData) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const miles = Number.parseFloat((formData.get("miles") as string | null) ?? "");
  if (!Number.isFinite(miles) || miles <= 0) return;
  const note = ((formData.get("note") as string | null) ?? "").trim().slice(0, MAX_NOTE) || null;

  await prisma.mileageEntry.create({
    data: {
      organizationId,
      userId: session.user.id,
      date: parseDate(formData.get("date") as string | null),
      miles: miles.toFixed(2),
      note,
    },
  });
  revalidatePath("/records/mileage");
}

export async function deleteMileageAction(id: string) {
  const session = await requireAuth();
  // Reach only the caller's own entry.
  const entry = await prisma.mileageEntry.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!entry) return;
  await prisma.mileageEntry.delete({ where: { id: entry.id } });
  revalidatePath("/records/mileage");
}
