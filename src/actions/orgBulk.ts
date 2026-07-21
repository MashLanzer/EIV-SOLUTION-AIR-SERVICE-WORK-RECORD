"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { planFeatureFlags } from "@/lib/billing";
import { PLANS, PLAN_KEYS } from "@/lib/plans";

export type BulkOp = "watch" | "unwatch" | "plan:FREE" | "plan:PRO";

// Apply one quick action to many companies at once from the Companies list, so
// routine console upkeep (flagging, plan changes) doesn't need a visit per
// company. Each op is validated; a single platform-audit line records the batch.
export async function bulkUpdateOrgsAction(orgIds: string[], op: BulkOp): Promise<void> {
  const { email } = await requireSuperAdmin();

  const ids = [...new Set(orgIds.filter(Boolean))].slice(0, 500);
  if (ids.length === 0) return;

  // Only operate on real companies, and capture how many actually changed.
  const orgs = await prisma.organization.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const validIds = orgs.map((o) => o.id);
  if (validIds.length === 0) return;

  let summary: string;

  if (op === "watch") {
    await prisma.organization.updateMany({
      where: { id: { in: validIds } },
      data: { watchedAt: new Date(), watchedBy: email },
    });
    summary = `Flagged ${validIds.length} companies to watch`;
  } else if (op === "unwatch") {
    await prisma.organization.updateMany({
      where: { id: { in: validIds } },
      data: { watchedAt: null, watchNote: null, watchedBy: null },
    });
    summary = `Cleared the watch flag on ${validIds.length} companies`;
  } else if (op === "plan:FREE" || op === "plan:PRO") {
    const key = op.slice("plan:".length) as (typeof PLAN_KEYS)[number];
    if (!PLAN_KEYS.includes(key)) return;
    await prisma.organization.updateMany({
      where: { id: { in: validIds } },
      data: { plan: key, ...planFeatureFlags(key) },
    });
    summary = `Set ${validIds.length} companies to the ${PLANS[key].name} plan`;
  } else {
    return;
  }

  await logAudit({
    organizationId: null,
    actor: { id: null, name: `Platform (${email})` },
    action: "platform.orgs.bulk",
    entityType: "platform",
    entityId: "companies",
    summary,
    isPlatform: true,
  });

  revalidatePath("/super/orgs");
  revalidatePath("/super");
}
