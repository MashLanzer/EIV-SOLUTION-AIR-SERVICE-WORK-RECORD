import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/superAdmin";
import { planLabel } from "@/lib/plans";
import {
  getOrgSummaries,
  type OrgPlanFilter,
  type OrgSort,
  type OrgStatusFilter,
} from "@/lib/platform";

export const runtime = "nodejs";

const STATUS_VALUES: OrgStatusFilter[] = ["all", "active", "suspended"];
const PLAN_VALUES: OrgPlanFilter[] = ["all", "FREE", "PRO", "none"];
const SORT_VALUES: OrgSort[] = ["newest", "oldest", "name", "recent", "idle", "users", "records"];

function oneOf<T extends string>(raw: string | null, allowed: T[], fallback: T): T {
  return raw && allowed.includes(raw as T) ? (raw as T) : fallback;
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Streams the Companies list as CSV, honoring the same status/plan/watched
// filters and sort as the page so "what you see is what you export".
export async function GET(request: Request) {
  await requireSuperAdmin();

  const sp = new URL(request.url).searchParams;
  const status = oneOf(sp.get("status"), STATUS_VALUES, "all");
  const plan = oneOf(sp.get("plan"), PLAN_VALUES, "all");
  const sort = oneOf(sp.get("sort"), SORT_VALUES, "newest");
  const watched = sp.get("watched") === "1";

  const orgs = await getOrgSummaries({ status, plan, sort, watched });

  const headers = [
    "Name",
    "Slug",
    "Status",
    "Plan",
    "Watched",
    "Users",
    "Records",
    "Invoices",
    "Created",
    "Last active",
  ];
  const lines = [headers.map(csvCell).join(",")];
  for (const o of orgs) {
    lines.push(
      [
        csvCell(o.name),
        csvCell(o.slug),
        csvCell(o.active ? "Active" : "Suspended"),
        csvCell(planLabel(o.plan)),
        csvCell(o.watched ? "Yes" : "No"),
        csvCell(o.users),
        csvCell(o.records),
        csvCell(o.invoices),
        csvCell(o.createdAt.toISOString().slice(0, 10)),
        csvCell(o.lastActivityAt ? o.lastActivityAt.toISOString().slice(0, 10) : "—"),
      ].join(",")
    );
  }
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="companies-${today}.csv"`,
    },
  });
}
