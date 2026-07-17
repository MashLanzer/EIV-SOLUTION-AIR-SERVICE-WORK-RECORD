import { ShieldCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsList";
import { InviteCodeCard } from "@/components/settings/InviteCodeCard";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function TeamSettingsPage() {
  const session = await requirePermission("settings.manage");
  const org = await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: { joinCode: true },
  });
  const t = await getT();
  const h = t.settings.hub;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={h.team} description={h.teamHint} backHref="/admin/settings" backLabel={t.settings.title} />

      <SettingsSection>
        <SettingsRow
          icon={Users}
          label={h.workersRow}
          sublabel={h.workersHint}
          href="/admin/workers"
        />
        <SettingsRow
          icon={ShieldCheck}
          label={h.rolesRow}
          sublabel={h.rolesHint}
          href="/admin/roles"
        />
      </SettingsSection>

      <InviteCodeCard code={org?.joinCode ?? null} />
    </div>
  );
}
