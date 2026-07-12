import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { SuccessToast } from "@/components/ui/success-toast";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const session = await requireAdmin();
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
      requirePhoto: true,
      lockApprovedRecords: true,
    },
  });
  return (
    <>
      {reset && <SuccessToast message="All history was reset" />}
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
          requirePhoto: org?.requirePhoto ?? false,
          lockApprovedRecords: org?.lockApprovedRecords ?? false,
        }}
      />
    </>
  );
}
