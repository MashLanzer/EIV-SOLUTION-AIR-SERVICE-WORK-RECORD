import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { SuccessToast } from "@/components/ui/success-toast";
import { requireAdmin } from "@/lib/session";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const session = await requireAdmin();
  const { reset } = await searchParams;
  return (
    <>
      {reset && <SuccessToast message="All history was reset" />}
      <SettingsScreen
        name={session.user.name ?? ""}
        email={session.user.email ?? ""}
        role="ADMIN"
        backHref="/admin"
      />
    </>
  );
}
