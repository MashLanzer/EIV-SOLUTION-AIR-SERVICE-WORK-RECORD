import { SettingsScreen } from "@/components/settings/SettingsScreen";
import { requireAuth } from "@/lib/session";

export default async function WorkerSettingsPage() {
  const session = await requireAuth();
  return (
    <SettingsScreen role={session.user.role} backHref="/records" />
  );
}
