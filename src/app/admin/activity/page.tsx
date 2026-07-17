import { NotificationsScreen } from "@/components/notifications/NotificationsScreen";
import { requireOrgId } from "@/lib/orgScope";
import { requireOfficeAccess } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { session } = await requireOfficeAccess();
  const { tab } = await searchParams;

  return (
    <NotificationsScreen
      userId={session.user.id}
      organizationId={requireOrgId(session)}
      isAdmin
      basePath="/admin/activity"
      tab={tab}
    />
  );
}
