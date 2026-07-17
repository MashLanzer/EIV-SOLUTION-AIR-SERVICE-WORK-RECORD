import { Clock, Globe } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SettingsSection } from "@/components/settings/SettingsList";
import { SettingsSegmented } from "@/components/settings/SettingsSegmented";
import { SettingsSelect } from "@/components/settings/SettingsSelect";
import { setTimeFormatAction, setTimeZoneAction } from "@/actions/organization";
import { TIME_ZONES } from "@/lib/timezone";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function LocalizationSettingsPage() {
  const session = await requirePermission("settings.manage");
  const org = await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: { timeFormat: true, timeZone: true },
  });
  const t = await getT();
  const l = t.settings.localization;

  // Keep whatever zone the org has selectable even if it isn't in the curated
  // shortlist (an admin could have set an uncommon one directly).
  const currentZone = org?.timeZone ?? "UTC";
  const zoneOptions = TIME_ZONES.some((z) => z.value === currentZone)
    ? TIME_ZONES
    : [{ value: currentZone, label: currentZone }, ...TIME_ZONES];

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
        <SettingsSelect
          icon={Globe}
          label={l.timeZone}
          sublabel={l.timeZoneHint}
          value={currentZone}
          options={zoneOptions}
          action={setTimeZoneAction}
        />
      </SettingsSection>
    </div>
  );
}
