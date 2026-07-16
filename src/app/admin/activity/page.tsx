import { Activity } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { MarkActivitySeen } from "@/components/activity/MarkActivitySeen";
import { getActivityFeed } from "@/lib/activity";
import { requireOrgId } from "@/lib/orgScope";
import { requireOfficeAccess } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const { session } = await requireOfficeAccess();
  const events = await getActivityFeed({
    organizationId: requireOrgId(session),
    userId: session.user.id,
    isAdmin: true,
  });
  const t = (await getT()).activity;

  return (
    <div className="flex flex-col gap-4">
      <MarkActivitySeen />
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t.adminTitle}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t.adminSubtitle}
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={t.nothingYet}
          description={t.adminNothingDesc}
        />
      ) : (
        <ActivityFeed events={events} />
      )}
    </div>
  );
}
