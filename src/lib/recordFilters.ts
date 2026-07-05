import type { Prisma, RecordStatus } from "@prisma/client";

export interface RecordFilterParams {
  dateFrom?: string;
  dateTo?: string;
  workerId?: string;
  customerName?: string;
  jobNumber?: string;
  status?: RecordStatus;
  ids?: string[];
}

const RECORD_STATUSES: RecordStatus[] = [
  "SUBMITTED",
  "APPROVED",
  "NEEDS_CHANGES",
];

export function parseRecordFilterParams(
  searchParams: Record<string, string | string[] | undefined>
): RecordFilterParams {
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const ids = searchParams.ids
    ? Array.isArray(searchParams.ids)
      ? searchParams.ids
      : [searchParams.ids]
    : undefined;

  const rawStatus = first(searchParams.status);

  return {
    dateFrom: first(searchParams.dateFrom) || undefined,
    dateTo: first(searchParams.dateTo) || undefined,
    workerId: first(searchParams.workerId) || undefined,
    customerName: first(searchParams.customerName) || undefined,
    jobNumber: first(searchParams.jobNumber) || undefined,
    status: RECORD_STATUSES.includes(rawStatus as RecordStatus)
      ? (rawStatus as RecordStatus)
      : undefined,
    ids: ids && ids.length > 0 ? ids : undefined,
  };
}

export function buildRecordWhereClause(
  filters: RecordFilterParams
): Prisma.WorkRecordWhereInput {
  if (filters.ids && filters.ids.length > 0) {
    return { id: { in: filters.ids } };
  }

  const where: Prisma.WorkRecordWhereInput = {};

  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }
  if (filters.workerId) {
    where.submittedById = filters.workerId;
  }
  if (filters.customerName) {
    where.customerName = { contains: filters.customerName, mode: "insensitive" };
  }
  if (filters.jobNumber) {
    where.jobNumber = { contains: filters.jobNumber, mode: "insensitive" };
  }
  if (filters.status) {
    where.status = filters.status;
  }

  return where;
}
