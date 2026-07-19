import type { Plan } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/invoices";

// Cross-tenant platform metrics for the owner console. These bypass the normal
// org scoping ON PURPOSE, so they must only ever be called from pages/actions
// already behind requireSuperAdmin.

export async function getPlatformOverview() {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  // The 30 days before that, so the "new in 30d" tiles can show a trend.
  const prevSince = new Date();
  prevSince.setUTCDate(prevSince.getUTCDate() - 60);

  const [
    organizations,
    users,
    records,
    invoices,
    paidInvoices,
    newOrgs,
    newRecords,
    prevNewOrgs,
    prevNewRecords,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.workRecord.count(),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: "PAID" } }),
    prisma.organization.count({ where: { createdAt: { gte: since } } }),
    prisma.workRecord.count({ where: { createdAt: { gte: since } } }),
    prisma.organization.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    prisma.workRecord.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
  ]);

  return {
    organizations,
    users,
    records,
    invoices,
    paidInvoices,
    newOrgs,
    newRecords,
    prevNewOrgs,
    prevNewRecords,
  };
}

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  active: boolean;
  plan: Plan | null;
  users: number;
  records: number;
  invoices: number;
};

export async function getOrgSummaries(): Promise<OrgSummary[]> {
  const rows = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      active: true,
      plan: true,
      _count: { select: { users: true, records: true, invoices: true } },
    },
  });
  return rows.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    createdAt: o.createdAt,
    active: o.active,
    plan: o.plan,
    users: o._count.users,
    records: o._count.records,
    invoices: o._count.invoices,
  }));
}

export type GrowthPoint = {
  key: string;
  label: string;
  orgs: number;
  records: number;
  revenue: number;
};

// Monthly growth series for the last `months` months, plus active/suspended
// counts. Buckets are computed in JS (simple + DB-agnostic); fine at the
// owner-console scale. Must only be called from behind requireSuperAdmin.
export async function getPlatformGrowth(
  months = 6
): Promise<{ points: GrowthPoint[]; activeOrgs: number; suspendedOrgs: number }> {
  const now = new Date();
  const startMonthIndex = now.getUTCMonth() - (months - 1);
  const start = new Date(Date.UTC(now.getUTCFullYear(), startMonthIndex, 1));

  const monthKey = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const buckets: { key: string; label: string }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), startMonthIndex + i, 1));
    buckets.push({
      key: monthKey(d),
      label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    });
  }
  const indexOf = new Map(buckets.map((b, i) => [b.key, i]));
  const orgsArr = new Array<number>(months).fill(0);
  const recordsArr = new Array<number>(months).fill(0);
  const revenueArr = new Array<number>(months).fill(0);

  const [orgRows, recordRows, paidInvoices, activeOrgs, suspendedOrgs] = await Promise.all([
    prisma.organization.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.workRecord.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.invoice.findMany({
      where: { status: "PAID", paidAt: { gte: start } },
      select: { paidAt: true, taxRate: true, lineItems: { select: { quantity: true, unitPrice: true } } },
    }),
    prisma.organization.count({ where: { active: true } }),
    prisma.organization.count({ where: { active: false } }),
  ]);

  for (const o of orgRows) {
    const i = indexOf.get(monthKey(o.createdAt));
    if (i !== undefined) orgsArr[i]++;
  }
  for (const r of recordRows) {
    const i = indexOf.get(monthKey(r.createdAt));
    if (i !== undefined) recordsArr[i]++;
  }
  for (const inv of paidInvoices) {
    if (!inv.paidAt) continue;
    const i = indexOf.get(monthKey(inv.paidAt));
    if (i === undefined) continue;
    revenueArr[i] += computeTotals(
      inv.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
      Number(inv.taxRate)
    ).total;
  }

  const points = buckets.map((b, i) => ({
    key: b.key,
    label: b.label,
    orgs: orgsArr[i],
    records: recordsArr[i],
    revenue: Math.round(revenueArr[i] * 100) / 100,
  }));
  return { points, activeOrgs, suspendedOrgs };
}

export async function getOrgDetail(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      joinCode: true,
      active: true,
      plan: true,
      createdAt: true,
      currencySymbol: true,
      featureInvoicing: true,
      featureEstimates: true,
      featurePortal: true,
      _count: {
        select: {
          users: true,
          records: true,
          invoices: true,
          projects: true,
          customers: true,
        },
      },
      users: {
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, email: true, role: true, active: true },
      },
    },
  });
  if (!org) return null;

  // Paid revenue for this one org (bounded to a single tenant, so loading line
  // items here is fine).
  const paid = await prisma.invoice.findMany({
    where: { organizationId: id, status: "PAID" },
    select: { taxRate: true, lineItems: { select: { quantity: true, unitPrice: true } } },
  });
  const revenue = paid.reduce(
    (sum, inv) =>
      sum +
      computeTotals(
        inv.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
        Number(inv.taxRate)
      ).total,
    0
  );

  return { ...org, revenue };
}
