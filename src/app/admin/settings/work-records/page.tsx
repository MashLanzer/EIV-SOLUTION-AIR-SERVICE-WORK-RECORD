import { Camera, DollarSign, Gauge, Lock, PenLine, Tag, Users, Wrench } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsList";
import { DefaultNotesRow } from "@/components/settings/DefaultNotesRow";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { PolicyToggle } from "@/components/settings/PolicyToggle";
import {
  setLockApprovedRecordsAction,
  setRequireCustomerSignatureAction,
  setRequireHelperAction,
  setRequirePhotoAction,
  updateCompanyFieldAction,
} from "@/actions/organization";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function WorkRecordsSettingsPage() {
  const session = await requirePermission("settings.manage");
  const org = await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: {
      requirePhoto: true,
      requireHelper: true,
      requireCustomerSignature: true,
      lockApprovedRecords: true,
      defaultLeadPay: true,
      defaultHelperPay: true,
      currencySymbol: true,
      scheduleOverloadThreshold: true,
      defaultWorkNotes: true,
    },
  });
  const t = await getT();
  const s = t.settings.workRecords;
  const currency = org?.currencySymbol || "$";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={s.section} description={s.description} backHref="/admin/settings" backLabel={t.settings.title} />

      <SettingsSection>
        <PolicyToggle
          icon={Camera}
          label={s.requirePhoto}
          sublabel={s.requirePhotoHint}
          initial={org?.requirePhoto ?? false}
          action={setRequirePhotoAction}
          ariaLabel={s.requirePhoto}
        />
        <PolicyToggle
          icon={Users}
          label={s.requireHelper}
          sublabel={s.requireHelperHint}
          initial={org?.requireHelper ?? false}
          action={setRequireHelperAction}
        />
        <PolicyToggle
          icon={PenLine}
          label={s.requireCustomerSignature}
          sublabel={s.requireCustomerSignatureHint}
          initial={org?.requireCustomerSignature ?? true}
          action={setRequireCustomerSignatureAction}
        />
        <PolicyToggle
          icon={Lock}
          label={s.lockApproved}
          sublabel={s.lockApprovedHint}
          initial={org?.lockApprovedRecords ?? false}
          action={setLockApprovedRecordsAction}
        />
      </SettingsSection>

      <SettingsSection>
        <InlineEditRow
          icon={DollarSign}
          label={`${s.defaultLeadPay} (${currency})`}
          value={org?.defaultLeadPay != null ? String(org.defaultLeadPay) : ""}
          placeholder="0.00"
          action={updateCompanyFieldAction.bind(null, "leadPay")}
          helpWhenEditing={s.defaultLeadPayHelp}
        />
        <InlineEditRow
          icon={DollarSign}
          label={`${s.defaultHelperPay} (${currency})`}
          value={org?.defaultHelperPay != null ? String(org.defaultHelperPay) : ""}
          placeholder="0.00"
          action={updateCompanyFieldAction.bind(null, "helperPay")}
          helpWhenEditing={s.defaultHelperPayHelp}
        />
        <InlineEditRow
          icon={Gauge}
          label={s.overloadThreshold}
          value={org?.scheduleOverloadThreshold != null ? String(org.scheduleOverloadThreshold) : "4"}
          placeholder="4"
          action={updateCompanyFieldAction.bind(null, "overloadThreshold")}
          helpWhenEditing={s.overloadThresholdHelp}
        />
        <DefaultNotesRow value={org?.defaultWorkNotes ?? ""} />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          icon={Tag}
          label={s.workTypes}
          sublabel={s.workTypesHint}
          href="/admin/settings/work-types"
        />
        <SettingsRow
          icon={Wrench}
          label={t.settings.skillsCatalog.title}
          sublabel={t.settings.skillsCatalog.rowHint}
          href="/admin/settings/skills"
        />
      </SettingsSection>
    </div>
  );
}
