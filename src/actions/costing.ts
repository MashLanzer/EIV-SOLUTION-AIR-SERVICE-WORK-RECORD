"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

// Set (or clear) the manual revenue used by the profitability card when a job
// has no invoice. Blank/invalid clears it. Ignored downstream when a non-void
// invoice is linked (the invoice's subtotal wins).
export async function setJobValueAction(recordId: string, formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const record = await prisma.workRecord.findFirst({
    where: { id: recordId, organizationId },
    select: { id: true },
  });
  if (!record) return;

  const raw = (formData.get("jobValue") as string | null)?.trim() ?? "";
  let jobValue: string | null = null;
  if (raw) {
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) return;
    jobValue = n.toFixed(2);
  }

  await prisma.workRecord.update({ where: { id: record.id }, data: { jobValue } });
  revalidatePath(`/admin/records/${recordId}`);
  revalidatePath("/admin/financials");
}
