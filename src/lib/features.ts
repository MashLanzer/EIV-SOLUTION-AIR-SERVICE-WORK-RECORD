import { cache } from "react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

export type FeatureKey = "invoicing" | "estimates" | "portal";

export type OrgFeatures = Record<FeatureKey, boolean>;

// Per-request memoized read of a company's module toggles. Missing/unknown org
// falls back to everything on, matching the "default true" columns.
export const getOrgFeatures = cache(async (organizationId: string): Promise<OrgFeatures> => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { featureInvoicing: true, featureEstimates: true, featurePortal: true },
  });
  return {
    invoicing: org?.featureInvoicing ?? true,
    estimates: org?.featureEstimates ?? true,
    portal: org?.featurePortal ?? true,
  };
});

// Guard a page/action behind a module toggle: 404s when the company doesn't
// have the module, so a disabled section is invisible even via a deep link.
export async function requireFeature(organizationId: string, key: FeatureKey): Promise<void> {
  const features = await getOrgFeatures(organizationId);
  if (!features[key]) notFound();
}
