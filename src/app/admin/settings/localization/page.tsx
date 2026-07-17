import { Clock } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SettingsSection } from "@/components/settings/SettingsList";
import { SettingsSegmented } from "@/components/settings/SettingsSegmented";
import { setTimeFormatAction } from "@/actions/organization";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function LocalizationSettingsPage() {
  const session = await requirePermission("settings.manage");
  const org = await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: { timeFormat: true },
  });
  const t = await getT();
  const l = t.settings.localization;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={l.section} description={l.description} backHref="/admin/settings" backLabel={t.settings.title} />
      <SettingsSection>
        <SettingsSegmented
          icon={Clock}
          label={l.timeFormat}
          sublabel={l.timeFormatHint}
          value={org?.timeFormat === "24" ? "24" : "12"}
          options={[
            { value: "12", label: l.format12 },
            { value: "24", label: l.format24 },
          ]}
          action={setTimeFormatAction}
        />
      </SettingsSection>
    </div>
  );
}
