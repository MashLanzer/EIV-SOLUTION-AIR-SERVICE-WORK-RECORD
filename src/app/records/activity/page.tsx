import { Activity } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { MarkActivitySeen } from "@/components/activity/MarkActivitySeen";
import { getActivityFeed } from "@/lib/activity";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function WorkerActivityPage() {
  const session = await requireAuth();
  const events = await getActivityFeed({
    organizationId: requireOrgId(session),
    userId: session.user.id,
    isAdmin: false,
  });

  return (
    <div className="flex flex-col gap-4">
      <MarkActivitySeen />
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Activity
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Updates on your records and comments on your work.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nothing yet"
          description="When your records are approved or returned, or someone comments on your work, you'll see it here."
        />
      ) : (
        <ActivityFeed events={events} />
      )}
    </div>
  );
}
