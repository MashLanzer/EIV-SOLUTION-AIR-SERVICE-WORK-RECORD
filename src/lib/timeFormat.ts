import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { TIME_FORMAT_COOKIE } from "@/lib/timeFormatCookie";

// Whether times should display in 24-hour form. A per-device cookie (set in
// Settings → Appearance) wins when present, so a worker can pick 12/24h on
// their own phone; otherwise it falls back to the company setting (Settings →
// Localization), and to 12-hour — the historical default — when neither is set.
// Resolving here (the single place every page reads) means server-rendered and
// client-provided times stay in sync after a refresh.
export async function getUse24Hour(organizationId: string): Promise<boolean> {
  const pref = (await cookies()).get(TIME_FORMAT_COOKIE)?.value;
  if (pref === "24") return true;
  if (pref === "12") return false;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { timeFormat: true },
  });
  return org?.timeFormat === "24";
}
