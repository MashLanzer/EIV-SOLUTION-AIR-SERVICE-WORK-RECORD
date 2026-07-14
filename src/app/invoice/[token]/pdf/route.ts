import { NextResponse } from "next/server";

import { companyForPdf, renderInvoicePdf } from "@/lib/pdf";
import { computeTotals, formatInvoiceNumber } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
import { getLocale, getT } from "@/lib/i18n/server";

export const runtime = "nodejs";

// Public invoice PDF, reachable only with the invoice's publicToken (no auth).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { publicToken: token },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
  if (!invoice) {
    return new NextResponse("Not found", { status: 404 });
  }

  const dict = await getT();
  const t = dict.invoices;
  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const statusLabel: Record<typeof invoice.status, string> = {
    DRAFT: t.statusDraft,
    SENT: t.statusSent,
    PAID: t.statusPaid,
    VOID: t.statusVoid,
  };
  const lines = invoice.lineItems.map((li) => ({
    description: li.description,
    quantity: Number(li.quantity),
    unitPrice: Number(li.unitPrice),
  }));
  const totals = computeTotals(lines, Number(invoice.taxRate));
  const company = await companyForPdf(invoice.organizationId);

  const buffer = await renderInvoicePdf(
    {
      number: formatInvoiceNumber(invoice.number),
      statusLabel: statusLabel[invoice.status],
      customerName: invoice.customerName,
      customerAddress: invoice.customerAddress,
      issued: dateFmt.format(invoice.issueDate),
      due: invoice.dueDate ? dateFmt.format(invoice.dueDate) : null,
      taxRatePercent: Number(invoice.taxRate),
      notes: invoice.notes,
      lines,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
    },
    company,
    {
      invoice: t.colNumber,
      billTo: t.billTo,
      issued: t.issued,
      due: t.due,
      description: t.descriptionPlaceholder,
      qty: t.qty,
      unitPrice: t.unitPrice,
      amount: t.amount,
      subtotal: t.subtotal,
      tax: t.tax,
      total: t.total,
      notes: t.notes,
    }
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${formatInvoiceNumber(invoice.number)}.pdf"`,
    },
  });
}
