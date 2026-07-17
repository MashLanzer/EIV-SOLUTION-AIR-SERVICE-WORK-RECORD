"use server";

import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { buildWorkerPayBreakdown, type PayBreakdownLine } from "@/lib/payReport";

export interface WorkerPayBreakdown {
  name: string;
  lines: PayBreakdownLine[];
  jobs: number;
  leadTotal: number;
  helperTotal: number;
  total: number;
  avgPerJob: number;
}

// Fetch the per-job breakdown behind one person's pay-report row, on demand
// when their row/card is tapped. Scoped to the caller's org and gated on the
// same reports.view permission as the report itself.
export async function getWorkerPayBreakdownAction(
  name: string,
  dateFrom: string,
  dateTo: string
): Promise<WorkerPayBreakdown> {
  const session = await requirePermission("reports.view");
  const organizationId = requireOrgId(session);
  return buildWorkerPayBreakdown({ name, dateFrom, dateTo }, organizationId);
}
