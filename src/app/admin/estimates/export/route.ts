import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireFeature } from "@/lib/features";
import { requirePermission } from "@/lib/authz";
import { computeTotals } from "@/lib/invoices";
import { ESTIMATE_STATUSES, formatEstimateNumber, isEstimateExpired } from "@/lib/estimates";
import type { EstimateStatus } from "@prisma/client";

export const runtime = "nodejs";

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}
const isoDay = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : "");

// Streams the estimate list as a CSV, honoring the same search + status (or
// the "expired" pseudo-status) filter as the page so "what you see is what
// you export".
export async function GET(request: Request) {
  const session = await requirePermission("estimates.manage");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "estimates");

  const sp = new URL(request.url).searchParams;
  const query = sp.get("q")?.trim().toLowerCase() || undefined;
  const rawStatus = sp.get("status") ?? undefined;
  const status = ESTIMATE_STATUSES.includes(rawStatus as EstimateStatus)
    ? (rawStatus as EstimateStatus)
    : undefined;
  const expiredFilter = rawStatus === "expired";

  const rows = await prisma.estimate.findMany({
    where: { organizationId },
    orderBy: [{ issueDate: "desc" }, { number: "desc" }],
    select: {
      number: true,
      status: true,
      customerName: true,
      customerAddress: true,
      issueDate: true,
      expiryDate: true,
      taxRate: true,
      lineItems: { select: { quantity: true, unitPrice: true } },
    },
  });

  const now = new Date();
  const mapped = rows.map((e) => ({
    number: e.number,
    status: e.status,
    customerName: e.customerName,
    customerAddress: e.customerAddress,
    issueDate: e.issueDate,
    expiryDate: e.expiryDate,
    total: computeTotals(
      e.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
      Number(e.taxRate)
    ).total,
    expired: isEstimateExpired(e.status, e.expiryDate, now),
  }));

  const filtered = mapped.filter((e) => {
    if (status && e.status !== status) return false;
    if (expiredFilter && !e.expired) return false;
    if (query) {
      const hay = `${formatEstimateNumber(e.number)} ${e.customerName}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const headers = ["Number", "Status", "Customer", "Address", "Issued", "Expires", "Total"];
  const lines = [headers.map(csvCell).join(",")];
  for (const e of filtered) {
    lines.push(
      [
        csvCell(formatEstimateNumber(e.number)),
        csvCell(e.expired ? `${e.status} (EXPIRED)` : e.status),
        csvCell(e.customerName),
        csvCell(e.customerAddress ?? ""),
        csvCell(isoDay(e.issueDate)),
        csvCell(isoDay(e.expiryDate)),
        csvCell(e.total.toFixed(2)),
      ].join(",")
    );
  }
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="estimates-${today}.csv"`,
    },
  });
}
