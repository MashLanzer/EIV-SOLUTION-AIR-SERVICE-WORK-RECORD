import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/invoices";
import { requireSuperAdmin } from "@/lib/superAdmin";

export const runtime = "nodejs";

// Full JSON backup of one company's business data (behind requireSuperAdmin).
// Excludes heavy blobs (signatures, photo data URLs) so the file stays a
// portable record rather than a media dump.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await ctx.params;

  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      users: { select: { name: true, email: true, role: true, active: true } },
      customers: { select: { name: true, address: true, phone: true, email: true, createdAt: true } },
      projects: { select: { name: true, address: true, status: true, createdAt: true } },
      records: {
        orderBy: { date: "desc" },
        select: {
          date: true,
          jobNumber: true,
          customerName: true,
          customerAddress: true,
          leadInstallerName: true,
          helperName: true,
          typeOfWork: true,
          arrivalTime: true,
          departureTime: true,
          status: true,
          leadInstallerPay: true,
          helperPay: true,
        },
      },
      invoices: {
        orderBy: { number: "asc" },
        select: {
          number: true,
          status: true,
          customerName: true,
          issueDate: true,
          dueDate: true,
          paidAt: true,
          taxRate: true,
          lineItems: { select: { description: true, quantity: true, unitPrice: true } },
        },
      },
    },
  });
  if (!org) return new NextResponse("Not found", { status: 404 });

  // Attach a computed total to each invoice for convenience.
  const invoices = org.invoices.map((inv) => ({
    ...inv,
    total: computeTotals(
      inv.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
      Number(inv.taxRate)
    ).total,
  }));

  const payload = {
    exportedAt: new Date().toISOString(),
    company: { id: org.id, name: org.name, slug: org.slug, createdAt: org.createdAt },
    counts: {
      users: org.users.length,
      customers: org.customers.length,
      projects: org.projects.length,
      records: org.records.length,
      invoices: org.invoices.length,
    },
    users: org.users,
    customers: org.customers,
    projects: org.projects,
    records: org.records,
    invoices,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="company-${org.slug}.json"`,
    },
  });
}
