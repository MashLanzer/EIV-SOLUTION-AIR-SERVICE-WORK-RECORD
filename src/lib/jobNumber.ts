import { prisma } from "@/lib/prisma";

// Suggest the next sequential job number for an org.
//
// When the company has set a job-number prefix (Settings → Documents, e.g.
// "WO-"), we look at the numeric tail of existing numbers that share that
// prefix and suggest prefix + (max + 1) — so "WO-1041" follows "WO-1040". The
// first number under a new prefix is prefix + "1".
//
// With no prefix configured we keep the plain-numeric behaviour: the largest
// purely numeric jobNumber plus one. Companies whose numbers aren't numeric
// (e.g. "INV-1024" with no matching prefix) get no suggestion (empty string),
// so we never impose a scheme that doesn't match how they already number jobs.
export async function suggestNextJobNumber(organizationId: string): Promise<string> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { jobNumberPrefix: true },
    });
    const prefix = org?.jobNumberPrefix?.trim() ?? "";

    if (prefix) {
      // Numbers under this prefix: strip the prefix, keep the numeric tails,
      // and suggest the max + 1 (re-applying the prefix). Escape the prefix so
      // characters like "-" or "." are matched literally by the regex.
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rows = await prisma.$queryRaw<{ max: bigint | null }[]>`
        SELECT MAX(CAST(SUBSTRING("jobNumber" FROM ${prefix.length + 1}) AS BIGINT)) AS max
        FROM "WorkRecord"
        WHERE "organizationId" = ${organizationId}
          AND "jobNumber" ~ ${"^" + escaped + "[0-9]+$"}
      `;
      const max = rows[0]?.max;
      return `${prefix}${max != null ? Number(max) + 1 : 1}`;
    }

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
