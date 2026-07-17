import {
  Building2,
  ClipboardList,
  CreditCard,
  Info,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { LogoutButton } from "@/components/layout/LogoutButton";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsList";
import { requireOfficeAccess } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

// The product version shown in About.
const APP_VERSION = "AeroTrack 1.0";

// The settings hub: an iOS-style index that links out to dedicated section
// pages. Admins see the company/system groups; supervisors get General +
// About + sign out.
export default async function AdminSettingsPage() {
  const { session } = await requireOfficeAccess();
  const isAdmin = session.user.role === "ADMIN";
  const t = await getT();
  const s = t.settings;
  const h = s.hub;

  const role = session.user.role;
  const accessLabel =
    role === "ADMIN" ? s.about.admin : role === "SUPERVISOR" ? s.about.supervisor : s.about.worker;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={s.title} />

      <SettingsSection>
        <SettingsRow
          icon={Palette}
          label={h.general}
          sublabel={h.generalHint}
          href="/admin/settings/general"
        />
      </SettingsSection>

      {isAdmin && (
        <>
          <SettingsSection title={h.manageGroup}>
            <SettingsRow
              icon={Building2}
              label={s.company.section}
              sublabel={h.companyHint}
              href="/admin/settings/company"
            />
            <SettingsRow
              icon={ClipboardList}
              label={s.workRecords.section}
              sublabel={h.workRecordsHint}
              href="/admin/settings/work-records"
            />
            <SettingsRow
              icon={Users}
              label={h.team}
              sublabel={h.teamHint}
              href="/admin/settings/team"
            />
          </SettingsSection>

          <SettingsSection>
            <SettingsRow
              icon={CreditCard}
              label={h.billing}
              sublabel={h.billingHint}
              href="/admin/settings/billing"
            />
          </SettingsSection>

          <SettingsSection title={h.systemGroup}>
            <SettingsRow
              icon={SlidersHorizontal}
              label={h.advanced}
              sublabel={h.advancedHint}
              href="/admin/settings/advanced"
            />
          </SettingsSection>
        </>
      )}

      <SettingsSection title={s.about.section}>
        <SettingsRow icon={ShieldCheck} label={accessLabel} sublabel={s.about.accessLevel} />
        <SettingsRow icon={Info} label={s.about.version} trailing={APP_VERSION} />
      </SettingsSection>

      <SettingsSection>
        <LogoutButton />
      </SettingsSection>
    </div>
  );
}
