import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsSection } from "@/components/settings/SettingsList";
import { requireOfficeAccess } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function GeneralSettingsPage() {
  await requireOfficeAccess();
  const t = await getT();
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader
        title={t.settings.hub.general}
        backHref="/admin/settings"
        backLabel={t.settings.title}
      />
      <SettingsSection title={t.appearance.section} description={t.appearance.onThisDevice}>
        <AppearanceSettings />
      </SettingsSection>
    </div>
  );
}
