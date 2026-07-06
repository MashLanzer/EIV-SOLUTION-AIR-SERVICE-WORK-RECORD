import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { requireAdmin } from "@/lib/session";

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  return (
    <SettingsScreen
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      role="ADMIN"
      backHref="/admin"
    />
  );
}
