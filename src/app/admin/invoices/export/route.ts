import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { buildInvoiceCsv } from "@/lib/invoiceCsv";
import { formatInvoiceNumber, INVOICE_STATUSES } from "@/lib/invoices";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import type { InvoiceStatus } from "@prisma/client";

export const runtime = "nodejs";

// Streams the org's invoices as an accountant-ready CSV (QuickBooks/Excel).
// Honors the same search + status filters as the invoices list so "what you
// see is what you export".
export async function GET(request: Request) {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim().toLowerCase() || undefined;
  const rawStatus = url.searchParams.get("status") ?? undefined;
  const status = INVOICE_STATUSES.includes(rawStatus as InvoiceStatus)
    ? (rawStatus as InvoiceStatus)
    : undefined;
  // "overdue" is a derived pseudo-status: not paid/void, with a due date in the
  // past. Expressed here as a Prisma filter so it matches the list.
  const overdueWhere =
    rawStatus === "overdue"
      ? { status: { notIn: ["PAID", "VOID"] as InvoiceStatus[] }, dueDate: { lt: new Date() } }
      : {};

  const rows = await prisma.invoice.findMany({
    where: { organizationId, ...(status ? { status } : {}), ...overdueWhere },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
    select: {
      number: true,
      status: true,
      customerName: true,
      customerAddress: true,
      issueDate: true,
      dueDate: true,
      paidAt: true,
      taxRate: true,
      lineItems: { select: { quantity: true, unitPrice: true } },
    },
  });

  const filtered = query
    ? rows.filter((inv) =>
        `${formatInvoiceNumber(inv.number)} ${inv.customerName}`.toLowerCase().includes(query)
      )
    : rows;

  const csv = buildInvoiceCsv(
    filtered.map((inv) => ({
      number: inv.number,
      status: inv.status,
      customerName: inv.customerName,
      customerAddress: inv.customerAddress,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      taxRate: Number(inv.taxRate),
      lineItems: inv.lineItems.map((li) => ({
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
      })),
    }))
  );

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoices-${today}.csv"`,
    },
  });
}
