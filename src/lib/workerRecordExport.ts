import type { RecordStatus } from "@prisma/client";

const WORKER_STATUSES: RecordStatus[] = ["SUBMITTED", "APPROVED", "NEEDS_CHANGES"];

// The Prisma `where` for a worker exporting their own records, mirroring the
// My Records list filters (status, date range, and the search across job
// number / customer / type / project). Always scoped to the worker's own
// submissions, so a worker can never export another crew member's records.
export function buildWorkerRecordWhere(
  params: URLSearchParams,
  organizationId: string,
  userId: string
) {
  const q = params.get("q")?.trim() || undefined;
  const rawStatus = params.get("status") ?? undefined;
  const status = WORKER_STATUSES.includes(rawStatus as RecordStatus)
    ? (rawStatus as RecordStatus)
    : undefined;
  const rawRange = params.get("range") ?? undefined;
  const range = rawRange === "week" || rawRange === "month" ? rawRange : "all";

  let cutoff: Date | undefined;
  if (range !== "all") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (range === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    else d.setDate(1);
    cutoff = d;
  }

  return {
    organizationId,
    submittedById: userId,
    ...(status ? { status } : {}),
    ...(cutoff ? { date: { gte: cutoff } } : {}),
    ...(q
      ? {
          OR: [
            { jobNumber: { contains: q, mode: "insensitive" as const } },
            { customerName: { contains: q, mode: "insensitive" as const } },
            { typeOfWork: { contains: q, mode: "insensitive" as const } },
            { project: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
}
