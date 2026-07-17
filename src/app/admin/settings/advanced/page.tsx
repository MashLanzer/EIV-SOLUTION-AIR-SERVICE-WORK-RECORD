import { History, ShieldCheck, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SuccessToast } from "@/components/ui/success-toast";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsList";
import { ResetHistoryDialog } from "@/components/settings/ResetHistoryDialog";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function AdvancedSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  await requirePermission("settings.manage");
  const { reset } = await searchParams;
  const t = await getT();
  const s = t.settings;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      {reset && <SuccessToast message={s.resetToast} />}
      <PageHeader
        title={s.hub.advanced}
        description={s.hub.advancedHint}
        backHref="/admin/settings"
        backLabel={s.title}
      />

      <SettingsSection>
        <SettingsRow
          icon={History}
          label={t.audit.title}
          sublabel={t.audit.desc}
          href="/admin/audit"
        />
        <SettingsRow
          icon={ShieldCheck}
          label={s.audit.title}
          sublabel={s.audit.rowHint}
          href="/admin/settings/audit"
        />
      </SettingsSection>

      {/* Danger zone */}
      <SettingsSection title={s.danger.section} description={s.danger.description}>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive-soft text-destructive-text">
            <Trash2 className="h-4.5 w-4.5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.danger.reset}</p>
          </div>
          <ResetHistoryDialog />
        </div>
      </SettingsSection>
    </div>
  );
}
