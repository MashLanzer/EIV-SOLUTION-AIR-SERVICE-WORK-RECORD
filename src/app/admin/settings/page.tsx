import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { SuccessToast } from "@/components/ui/success-toast";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const session = await requireAdmin();
  const t = await getT();
  const { reset } = await searchParams;
  const org = await prisma.organization.findUnique({
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
      requirePhoto: true,
      requireHelper: true,
      requireCustomerSignature: true,
      lockApprovedRecords: true,
      logoUrl: true,
      defaultWorkNotes: true,
    },
  });
  return (
    <>
      {reset && <SuccessToast message={t.settings.resetToast} />}
      <SettingsScreen
        role="ADMIN"
        backHref="/admin"
        inviteCode={org?.joinCode ?? null}
        company={{
          name: org?.name ?? "",
          phone: org?.companyPhone ?? "",
          address: org?.companyAddress ?? "",
          license: org?.licenseNumber ?? "",
          leadPay: org?.defaultLeadPay != null ? String(org.defaultLeadPay) : "",
          helperPay:
            org?.defaultHelperPay != null ? String(org.defaultHelperPay) : "",
          currency: org?.currencySymbol || "$",
          requirePhoto: org?.requirePhoto ?? false,
          requireHelper: org?.requireHelper ?? false,
          requireCustomerSignature: org?.requireCustomerSignature ?? true,
          lockApprovedRecords: org?.lockApprovedRecords ?? false,
          logoUrl: org?.logoUrl ?? null,
          defaultWorkNotes: org?.defaultWorkNotes ?? "",
        }}
      />
    </>
  );
}
