import { PageHeader } from "@/components/ui/page-header";
import { WorkTypesManager } from "@/components/settings/WorkTypesManager";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getWorkTypeGroups, STARTER_PACKS } from "@/lib/workTypes";
import { getT } from "@/lib/i18n/server";

export default async function WorkTypesSettingsPage() {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  const groups = await getWorkTypeGroups(organizationId);
  const packs = STARTER_PACKS.map((p) => ({ id: p.id, label: p.label }));
  const t = await getT();
  const w = t.settings.workTypesPage;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader
        title={w.title}
        description={w.description}
        backHref="/admin/settings"
        backLabel={t.settings.title}
      />
      <WorkTypesManager groups={groups} packs={packs} />
    </div>
  );
}
