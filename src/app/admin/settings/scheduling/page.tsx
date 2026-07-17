import { CalendarDays, Clock, Timer } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SettingsSection } from "@/components/settings/SettingsList";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { SettingsSegmented } from "@/components/settings/SettingsSegmented";
import { setWeekStartsOnAction, updateCompanyFieldAction } from "@/actions/organization";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function SchedulingSettingsPage() {
  const session = await requirePermission("settings.manage");
  const org = await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: {
      defaultJobDurationMinutes: true,
      reminderLeadHours: true,
      weekStartsOn: true,
    },
  });
  const t = await getT();
  const s = t.settings.scheduling;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={s.section} description={s.description} backHref="/admin/settings" backLabel={t.settings.title} />
      <SettingsSection>
        <InlineEditRow
          icon={Timer}
          label={s.jobDuration}
          value={org?.defaultJobDurationMinutes != null ? String(org.defaultJobDurationMinutes) : "120"}
          placeholder="120"
          action={updateCompanyFieldAction.bind(null, "defaultJobDuration")}
          helpWhenEditing={s.jobDurationHint}
        />
        <InlineEditRow
          icon={Clock}
          label={s.reminderLead}
          value={org?.reminderLeadHours != null ? String(org.reminderLeadHours) : "24"}
          placeholder="24"
          action={updateCompanyFieldAction.bind(null, "reminderLeadHours")}
          helpWhenEditing={s.reminderLeadHint}
        />
        <SettingsSegmented
          icon={CalendarDays}
          label={s.weekStart}
          sublabel={s.weekStartHint}
          value={String(org?.weekStartsOn ?? 0)}
          options={[
            { value: "0", label: s.sunday },
            { value: "1", label: s.monday },
          ]}
          action={setWeekStartsOnAction}
        />
      </SettingsSection>
    </div>
  );
}
