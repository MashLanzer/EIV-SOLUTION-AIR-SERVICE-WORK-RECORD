import { ArrowLeft } from "lucide-react";
import Link from "next/link";

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
      <div>
        <Link
          href="/admin/settings"
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.title}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t.skillsCatalog.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {t.skillsCatalog.description}
        </p>
      </div>
      <OrgSkillsManager skills={skills} />
    </div>
  );
}
