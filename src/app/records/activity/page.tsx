import { NotificationsScreen } from "@/components/notifications/NotificationsScreen";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function WorkerActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireAuth();
  const { tab } = await searchParams;

  return (
    <NotificationsScreen
      userId={session.user.id}
      organizationId={requireOrgId(session)}
      isAdmin={false}
      basePath="/records/activity"
      tab={tab}
    />
  );
}
