import { prisma } from "@/lib/prisma";

// Whether this org displays times in 24-hour form (Settings → Localization).
// Falls back to 12-hour, the historical default, so a missing org or column
// never flips the format. Tiny query, mirroring getCurrencySymbol, so any page
// that shows a time can resolve the preference without pulling the whole org.
export async function getUse24Hour(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timeFormat: true },
  });
  return org?.timeFormat === "24";
}
