"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

function freshToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

// Turn on the public financial report link: mint an unguessable token
// (idempotent — returns the existing one if already shared).
export async function enableReportShareAction(): Promise<{ token: string } | null> {
  const session = await requirePermission("financials.view");
  const organizationId = requireOrgId(session);
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { reportToken: true },
  });
  const token = org?.reportToken ?? freshToken();
  if (!org?.reportToken) {
    await prisma.organization.update({ where: { id: organizationId }, data: { reportToken: token } });
  }
  revalidatePath("/admin/financials");
  return { token };
}

// Stop sharing: clear the token so the public link 404s.
export async function disableReportShareAction() {
  const session = await requirePermission("financials.view");
  const organizationId = requireOrgId(session);
  await prisma.organization.update({
    where: { id: organizationId },
    data: { reportToken: null },
  });
  revalidatePath("/admin/financials");
}
