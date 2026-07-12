import { prisma } from "@/lib/prisma";

// Suggest the next sequential job number for an org: the largest purely
// numeric jobNumber currently in use, plus one. Companies whose job numbers
// aren't numeric (e.g. "INV-1024") get no suggestion (empty string), so we
// never impose a scheme that doesn't match how they already number jobs.
export async function suggestNextJobNumber(organizationId: string): Promise<string> {
  try {
    const rows = await prisma.$queryRaw<{ max: bigint | null }[]>`
      SELECT MAX(CAST("jobNumber" AS BIGINT)) AS max
      FROM "WorkRecord"
      WHERE "organizationId" = ${organizationId}
        AND "jobNumber" ~ '^[0-9]+$'
    `;
    const max = rows[0]?.max;
    // Job numbers are well within safe-integer range in practice.
    return max != null ? String(Number(max) + 1) : "";
  } catch {
    // Never block the form on a suggestion failure.
    return "";
  }
}
