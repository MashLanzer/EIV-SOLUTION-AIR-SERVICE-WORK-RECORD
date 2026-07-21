import type { Plan } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/invoices";
import { getAuditLog } from "@/lib/audit";
import { PLANS } from "@/lib/plans";

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

// --- Global platform search (companies + users across every tenant) ---
export type PlatformSearchResult = {
  companies: { id: string; name: string; slug: string; active: boolean }[];
  users: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    orgId: string | null;
    orgName: string | null;
  }[];
};

export async function platformSearch(query: string): Promise<PlatformSearchResult> {
  const q = query.trim();
  if (!q) return { companies: [], users: [] };
  const [companies, users] = await Promise.all([
    prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true, active: true },
      orderBy: { name: "asc" },
      take: 8,
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        organization: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
      take: 8,
    }),
  ]);
  return {
    companies,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      orgId: u.organization?.id ?? null,
      orgName: u.organization?.name ?? null,
    })),
  };
}

// --- "Needs attention": companies that likely need a nudge ---
export type AttentionOrg = { id: string; name: string; lastActivity?: Date | null; createdAt?: Date };
export type PlatformAttention = {
  suspended: AttentionOrg[];
  neverActivated: AttentionOrg[];
  inactive: AttentionOrg[];
};

export async function getPlatformAttention(): Promise<PlatformAttention> {
  const now = new Date();
  const inactiveCutoff = new Date(now);
  inactiveCutoff.setUTCDate(now.getUTCDate() - 30);
  // Grace so a company signed up yesterday isn't flagged "never activated".
  const grace = new Date(now);
  grace.setUTCDate(now.getUTCDate() - 3);

  const [orgs, lastByOrg] = await Promise.all([
    prisma.organization.findMany({
      select: { id: true, name: true, active: true, createdAt: true, _count: { select: { records: true } } },
    }),
    prisma.workRecord.groupBy({ by: ["organizationId"], _max: { createdAt: true } }),
  ]);
  const lastRecord = new Map(lastByOrg.map((r) => [r.organizationId, r._max.createdAt]));

  const suspended: AttentionOrg[] = [];
  const neverActivated: AttentionOrg[] = [];
  const inactive: AttentionOrg[] = [];

  for (const o of orgs) {
    if (!o.active) {
      suspended.push({ id: o.id, name: o.name });
      continue;
    }
    if (o._count.records === 0) {
      if (o.createdAt < grace) neverActivated.push({ id: o.id, name: o.name, createdAt: o.createdAt });
      continue;
    }
    const last = lastRecord.get(o.id) ?? null;
    if (last && last < inactiveCutoff) inactive.push({ id: o.id, name: o.name, lastActivity: last });
  }
  // Most-stale first for the inactive list.
  inactive.sort((a, b) => (a.lastActivity?.getTime() ?? 0) - (b.lastActivity?.getTime() ?? 0));
  return { suspended, neverActivated, inactive };
}

// --- Company 360: last activity, most-active users, recent audit timeline ---
export async function getOrgActivity(id: string) {
  const [lastRecord, topRaw, recent] = await Promise.all([
    prisma.workRecord.aggregate({ where: { organizationId: id }, _max: { createdAt: true } }),
    prisma.workRecord.groupBy({
      by: ["submittedById"],
      where: { organizationId: id, submittedById: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { submittedById: "desc" } },
      take: 5,
    }),
    getAuditLog(id, { take: 6 }),
  ]);

  const ids = topRaw.map((t) => t.submittedById).filter((v): v is string => Boolean(v));
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const topUsers = topRaw
    .filter((t) => t.submittedById)
    .map((t) => ({ id: t.submittedById!, name: nameById.get(t.submittedById!) ?? "—", records: t._count._all }));

  return { lastActivity: lastRecord._max.createdAt, topUsers, recent };
}

// --- Platform activity feed: the owner's in-app "what's happening" pulse ---
export type PlatformFeedItem =
  | { kind: "signup"; id: string; date: Date; orgId: string; orgName: string }
  | {
      kind: "event";
      id: string;
      date: Date;
      action: string;
      summary: string;
      actorName: string;
      orgId: string | null;
      orgName: string | null;
    };

// Merges company signups with platform-level audit events (suspensions, plan
// changes, admin grants, support sessions) into one reverse-chronological
// stream. Sourced from existing data — no new tables, no email/push.
export async function getPlatformFeed(limit = 60): Promise<PlatformFeedItem[]> {
  const [signups, events] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.auditEvent.findMany({
      where: { isPlatform: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        summary: true,
        actorName: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
      },
    }),
  ]);

  const items: PlatformFeedItem[] = [
    ...signups.map((o) => ({
      kind: "signup" as const,
      id: `signup-${o.id}`,
      date: o.createdAt,
      orgId: o.id,
      orgName: o.name,
    })),
    ...events.map((e) => ({
      kind: "event" as const,
      id: e.id,
      date: e.createdAt,
      action: e.action,
      summary: e.summary,
      actorName: e.actorName,
      orgId: e.organization?.id ?? null,
      orgName: e.organization?.name ?? null,
    })),
  ];

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items.slice(0, limit);
}

// --- Revenue: plan distribution + estimated MRR from the plan catalog ---
export async function getPlatformRevenue(): Promise<{
  distribution: { plan: Plan | null; count: number }[];
  mrr: number;
}> {
  const byPlan = await prisma.organization.groupBy({
    by: ["plan"],
    where: { active: true },
    _count: { _all: true },
  });
  let mrr = 0;
  for (const r of byPlan) {
    if (r.plan) mrr += PLANS[r.plan].priceMonthly * r._count._all;
  }
  const distribution = byPlan
    .map((r) => ({ plan: r.plan, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
  return { distribution, mrr };
}
