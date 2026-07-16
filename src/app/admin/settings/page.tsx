import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { SuccessToast } from "@/components/ui/success-toast";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireOfficeAccess } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { session } = await requireOfficeAccess();
  const isAdmin = session.user.role === "ADMIN";
  const t = await getT();
  const { reset } = await searchParams;
  // Supervisors reach this page for appearance/language + sign out, but see no
  // company settings, so only admins pay for the org query.
  const org = isAdmin
    ? await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: {
      name: true,
      joinCode: true,
      companyPhone: true,
      companyAddress: true,
      licenseNumber: true,
      defaultLeadPay: true,
      defaultHelperPay: true,
      currencySymbol: true,
      defaultTaxRate: true,
      requirePhoto: true,
      requireHelper: true,
      requireCustomerSignature: true,
      lockApprovedRecords: true,
      logoUrl: true,
      defaultWorkNotes: true,
      scheduleOverloadThreshold: true,
    },
  })
    : null;
  return (
    <>
      {reset && <SuccessToast message={t.settings.resetToast} />}
      <SettingsScreen
        role={session.user.role}
        backHref="/admin"
        inviteCode={isAdmin ? org?.joinCode ?? null : undefined}
        company={
          isAdmin
            ? {
                name: org?.name ?? "",
                phone: org?.companyPhone ?? "",
                address: org?.companyAddress ?? "",
                license: org?.licenseNumber ?? "",
                leadPay: org?.defaultLeadPay != null ? String(org.defaultLeadPay) : "",
                helperPay:
                  org?.defaultHelperPay != null ? String(org.defaultHelperPay) : "",
                currency: org?.currencySymbol || "$",
                taxRate: org?.defaultTaxRate != null ? String(Number(org.defaultTaxRate)) : "",
                requirePhoto: org?.requirePhoto ?? false,
                requireHelper: org?.requireHelper ?? false,
                requireCustomerSignature: org?.requireCustomerSignature ?? true,
                lockApprovedRecords: org?.lockApprovedRecords ?? false,
                logoUrl: org?.logoUrl ?? null,
                defaultWorkNotes: org?.defaultWorkNotes ?? "",
                overloadThreshold:
                  org?.scheduleOverloadThreshold != null
                    ? String(org.scheduleOverloadThreshold)
                    : "4",
              }
            : undefined
        }
      />
    </>
  );
}
