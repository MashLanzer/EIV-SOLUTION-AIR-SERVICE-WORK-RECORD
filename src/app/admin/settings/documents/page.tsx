import { CalendarClock, FileText, Hash } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SettingsSection } from "@/components/settings/SettingsList";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { updateCompanyFieldAction } from "@/actions/organization";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function DocumentsSettingsPage() {
  const session = await requirePermission("settings.manage");
  const org = await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: { jobNumberPrefix: true, pdfFooter: true, receiptExpiryDays: true },
  });
  const t = await getT();
  const d = t.settings.documents;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={d.section} description={d.description} backHref="/admin/settings" backLabel={t.settings.title} />
      <SettingsSection>
        <InlineEditRow
          icon={Hash}
          label={d.jobPrefix}
          value={org?.jobNumberPrefix ?? ""}
          placeholder="WO-"
          action={updateCompanyFieldAction.bind(null, "jobNumberPrefix")}
          helpWhenEditing={d.jobPrefixHint}
        />
        <InlineEditRow
          icon={FileText}
          label={d.pdfFooter}
          value={org?.pdfFooter ?? ""}
          placeholder="Thank you for your business"
          action={updateCompanyFieldAction.bind(null, "pdfFooter")}
          helpWhenEditing={d.pdfFooterHint}
        />
        <InlineEditRow
          icon={CalendarClock}
          label={d.receiptExpiry}
          value={org?.receiptExpiryDays != null ? String(org.receiptExpiryDays) : ""}
          placeholder="30"
          action={updateCompanyFieldAction.bind(null, "receiptExpiryDays")}
          helpWhenEditing={d.receiptExpiryHint}
        />
      </SettingsSection>
    </div>
  );
}
