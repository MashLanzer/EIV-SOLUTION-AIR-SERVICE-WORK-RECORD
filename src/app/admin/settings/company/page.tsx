import { Building2, Coins, FileText, MapPin, Percent, Phone } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SettingsSection } from "@/components/settings/SettingsList";
import { CompanyLogoRow } from "@/components/settings/CompanyLogoRow";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import {
  updateCompanyFieldAction,
  updateOrganizationNameAction,
} from "@/actions/organization";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function CompanySettingsPage() {
  const session = await requirePermission("settings.manage");
  const org = await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: {
      name: true,
      companyPhone: true,
      companyAddress: true,
      licenseNumber: true,
      currencySymbol: true,
      defaultTaxRate: true,
      logoUrl: true,
    },
  });
  const t = await getT();
  const s = t.settings.company;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={s.section} description={s.description} backHref="/admin/settings" backLabel={t.settings.title} />
      <SettingsSection>
        <InlineEditRow
          icon={Building2}
          label={s.name}
          value={org?.name ?? ""}
          placeholder={s.name}
          action={updateOrganizationNameAction}
        />
        <InlineEditRow
          icon={Phone}
          label={s.phone}
          value={org?.companyPhone ?? ""}
          placeholder="(555) 123-4567"
          action={updateCompanyFieldAction.bind(null, "phone")}
        />
        <InlineEditRow
          icon={MapPin}
          label={s.address}
          value={org?.companyAddress ?? ""}
          placeholder="123 Main St, City, ST"
          action={updateCompanyFieldAction.bind(null, "address")}
        />
        <InlineEditRow
          icon={FileText}
          label={s.license}
          value={org?.licenseNumber ?? ""}
          placeholder="e.g. LIC-000000"
          action={updateCompanyFieldAction.bind(null, "license")}
        />
        <CompanyLogoRow url={org?.logoUrl ?? null} />
        <InlineEditRow
          icon={Coins}
          label={s.currency}
          value={org?.currencySymbol || "$"}
          placeholder="$"
          action={updateCompanyFieldAction.bind(null, "currency")}
          helpWhenEditing={s.currencyHelp}
        />
        <InlineEditRow
          icon={Percent}
          label={s.taxRate}
          value={org?.defaultTaxRate != null ? String(Number(org.defaultTaxRate)) : ""}
          placeholder="0"
          action={updateCompanyFieldAction.bind(null, "taxRate")}
          helpWhenEditing={s.taxRateHelp}
        />
      </SettingsSection>
    </div>
  );
}
