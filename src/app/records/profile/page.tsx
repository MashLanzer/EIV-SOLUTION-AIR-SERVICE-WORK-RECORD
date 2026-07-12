import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { requireAuth } from "@/lib/session";

export default async function WorkerProfilePage() {
  const session = await requireAuth();
  return (
    <ProfileScreen
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      phone={session.user.phone ?? null}
      storedSignature={session.user.storedSignature ?? null}
      role={session.user.role}
      backHref="/records"
    />
  );
}
