import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import {
  customerFilterWhere,
  customerSearchWhere,
  normalizeCustomerFilter,
} from "@/lib/customerFilters";
import { startOfUtcDay } from "@/lib/schedule";

export const runtime = "nodejs";

// Wrap a CSV field: always quote and double embedded quotes so commas/quotes/
// newlines inside names or addresses can't break columns.
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

const isoDay = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : "");

// Streams the customer list as a CSV, honoring the same search + quick filter
// as the page so "what you see is what you export".
export async function GET(request: Request) {
  const session = await requirePermission("customers.manage");
  const organizationId = requireOrgId(session);

  const sp = new URL(request.url).searchParams;
  const query = sp.get("q")?.trim() || undefined;
  const filter = normalizeCustomerFilter(sp.get("filter"));
  const today = startOfUtcDay(new Date());

  const rows = await prisma.customer.findMany({
    where: {
      organizationId,
      ...customerSearchWhere(query),
      ...customerFilterWhere(filter, today),
    },
    orderBy: { name: "asc" },
    select: {
      name: true,
      address: true,
      phone: true,
      email: true,
      createdAt: true,
      _count: { select: { records: true } },
      records: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
    },
  });

  const headers = [
    "Name",
    "Address",
    "Phone",
    "Email",
    "Jobs",
    "Last Visit",
    "Customer Since",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const c of rows) {
    lines.push(
      [
        csvCell(c.name),
        csvCell(c.address),
        csvCell(c.phone ?? ""),
        csvCell(c.email ?? ""),
        csvCell(c._count.records),
        csvCell(isoDay(c.records[0]?.date ?? null)),
        csvCell(isoDay(c.createdAt)),
      ].join(",")
    );
  }
  // Leading BOM so Excel reads UTF-8 accents; CRLF line ends for spreadsheets.
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  const today10 = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${today10}.csv"`,
    },
  });
}
