import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/invoices";

// Cross-tenant platform metrics for the owner console. These bypass the normal
// org scoping ON PURPOSE, so they must only ever be called from pages/actions
// already behind requireSuperAdmin.

export async function getPlatformOverview() {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);

  const [organizations, users, records, invoices, paidInvoices, newOrgs, newRecords] =
    await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.workRecord.count(),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "PAID" } }),
      prisma.organization.count({ where: { createdAt: { gte: since } } }),
      prisma.workRecord.count({ where: { createdAt: { gte: since } } }),
    ]);

  return { organizations, users, records, invoices, paidInvoices, newOrgs, newRecords };
}

export type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  active: boolean;
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
      _count: { select: { users: true, records: true, invoices: true } },
    },
  });
  return rows.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    createdAt: o.createdAt,
    active: o.active,
    users: o._count.users,
    records: o._count.records,
    invoices: o._count.invoices,
  }));
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
