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
    select: { name: true, joinCode: true },
  });
  return (
    <>
      {reset && <SuccessToast message="All history was reset" />}
      <SettingsScreen
        role="ADMIN"
        backHref="/admin"
        companyName={org?.name ?? ""}
        inviteCode={org?.joinCode ?? null}
      />
    </>
  );
}
