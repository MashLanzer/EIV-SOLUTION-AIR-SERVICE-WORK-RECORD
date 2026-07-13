import { Activity } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { MarkActivitySeen } from "@/components/activity/MarkActivitySeen";
import { getActivityFeed } from "@/lib/activity";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function WorkerActivityPage() {
  const session = await requireAuth();
  const events = await getActivityFeed({
    organizationId: requireOrgId(session),
    userId: session.user.id,
    isAdmin: false,
  });
  const t = (await getT()).activity;

  return (
    <div className="flex flex-col gap-4">
      <MarkActivitySeen />
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t.title}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t.subtitle}
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={t.nothingYet}
          description={t.nothingYetDesc}
        />
      ) : (
        <ActivityFeed events={events} />
      )}
    </div>
  );
}
