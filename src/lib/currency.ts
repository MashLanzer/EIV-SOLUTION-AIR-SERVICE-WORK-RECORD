import { prisma } from "@/lib/prisma";

// The org's currency symbol for money display (falls back to "$"). Kept tiny
// so pages that show pay can fetch it without pulling the whole org.
export async function getCurrencySymbol(organizationId: string): Promise<string> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { currencySymbol: true },
  });
  return org?.currencySymbol || "$";
}
