import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { requireAuth } from "@/lib/session";

export default async function WorkerSettingsPage() {
  const session = await requireAuth();
  return (
    <SettingsScreen
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      role={session.user.role}
      backHref="/records"
    />
  );
}
