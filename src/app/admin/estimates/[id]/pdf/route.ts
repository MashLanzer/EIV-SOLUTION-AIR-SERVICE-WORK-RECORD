import { NextResponse } from "next/server";

import { companyForPdf, renderEstimatePdf } from "@/lib/pdf";
import { computeTotals } from "@/lib/invoices";
import { formatEstimateNumber } from "@/lib/estimates";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireFeature } from "@/lib/features";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission("estimates.manage");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "estimates");
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
  if (!estimate) {
    return new NextResponse("Not found", { status: 404 });
  }

  const dict = await getT();
  const t = dict.estimates;
  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const statusLabel: Record<typeof estimate.status, string> = {
    DRAFT: t.statusDraft,
    SENT: t.statusSent,
    ACCEPTED: t.statusAccepted,
    DECLINED: t.statusDeclined,
  };

  const lines = estimate.lineItems.map((li) => ({
    description: li.description,
    quantity: Number(li.quantity),
    unitPrice: Number(li.unitPrice),
  }));
  const totals = computeTotals(lines, Number(estimate.taxRate));
  const company = await companyForPdf(organizationId);

  const buffer = await renderEstimatePdf(
    {
      number: formatEstimateNumber(estimate.number),
      statusLabel: statusLabel[estimate.status],
      customerName: estimate.customerName,
      customerAddress: estimate.customerAddress,
      issued: dateFmt.format(estimate.issueDate),
      validTill: estimate.expiryDate ? dateFmt.format(estimate.expiryDate) : null,
      taxRatePercent: Number(estimate.taxRate),
      notes: estimate.notes,
      lines,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
    },
    company,
    {
      estimate: t.colNumber,
      quoteFor: t.quoteFor,
      issued: t.issued,
      validTill: t.expires,
      status: t.colStatus,
      description: t.descriptionPlaceholder,
      qty: t.qty,
      unitPrice: t.unitPrice,
      amount: t.amount,
      subtotal: t.subtotal,
      tax: t.tax,
      total: t.total,
      notes: t.notes,
      disclaimer: t.pdfDisclaimer,
    }
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${formatEstimateNumber(estimate.number)}.pdf"`,
    },
  });
}
