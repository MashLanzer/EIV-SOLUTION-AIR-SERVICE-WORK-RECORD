import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { requireAdmin } from "@/lib/session";

export default async function AdminProfilePage() {
  const session = await requireAdmin();
  return (
    <ProfileScreen
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      phone={session.user.phone ?? null}
      storedSignature={session.user.storedSignature ?? null}
      role="ADMIN"
      backHref="/admin"
    />
  );
}
