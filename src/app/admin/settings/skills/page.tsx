import { PageHeader } from "@/components/ui/page-header";
import { OrgSkillsManager } from "@/components/settings/OrgSkillsManager";
import { getOrgSkills } from "@/lib/orgSkills";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function SkillsCatalogSettingsPage() {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  const skills = await getOrgSkills(organizationId);
  const t = (await getT()).settings;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader
        title={t.skillsCatalog.title}
        description={t.skillsCatalog.description}
        backHref="/admin/settings"
        backLabel={t.title}
      />
      <OrgSkillsManager skills={skills} />
    </div>
  );
}
