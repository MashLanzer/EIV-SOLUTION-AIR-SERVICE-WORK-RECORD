import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { WorkTypesManager } from "@/components/settings/WorkTypesManager";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getWorkTypeGroups, STARTER_PACKS } from "@/lib/workTypes";

export default async function WorkTypesSettingsPage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const groups = await getWorkTypeGroups(organizationId);
  const packs = STARTER_PACKS.map((p) => ({ id: p.id, label: p.label }));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <Link
          href="/admin/settings"
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Work types
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Organize the types of work your crew can pick on a record, grouped by category. Works for any trade.
        </p>
      </div>
      <WorkTypesManager groups={groups} packs={packs} />
    </div>
  );
}
