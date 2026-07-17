import { AtSign, CheckCircle2, Clock, Inbox } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SettingsSection } from "@/components/settings/SettingsList";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { PolicyToggle } from "@/components/settings/PolicyToggle";
import { setNotifyFlagAction, updateCompanyFieldAction } from "@/actions/organization";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function NotificationSettingsPage() {
  const session = await requirePermission("settings.manage");
  const org = await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: {
      notifyOnSubmit: true,
      notifyOnReview: true,
      notifyReminders: true,
      notifyReplyTo: true,
    },
  });
  const t = await getT();
  const n = t.settings.notif;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={n.section} description={n.description} backHref="/admin/settings" backLabel={t.settings.title} />
      <SettingsSection>
        <PolicyToggle
          icon={Inbox}
          label={n.onSubmit}
          sublabel={n.onSubmitHint}
          initial={org?.notifyOnSubmit ?? true}
          action={setNotifyFlagAction.bind(null, "onSubmit")}
        />
        <PolicyToggle
          icon={CheckCircle2}
          label={n.onReview}
          sublabel={n.onReviewHint}
          initial={org?.notifyOnReview ?? true}
          action={setNotifyFlagAction.bind(null, "onReview")}
        />
        <PolicyToggle
          icon={Clock}
          label={n.reminders}
          sublabel={n.remindersHint}
          initial={org?.notifyReminders ?? true}
          action={setNotifyFlagAction.bind(null, "reminders")}
        />
        <InlineEditRow
          icon={AtSign}
          label={n.replyTo}
          value={org?.notifyReplyTo ?? ""}
          placeholder="replies@yourcompany.com"
          action={updateCompanyFieldAction.bind(null, "notifyReplyTo")}
          helpWhenEditing={n.replyToHint}
        />
      </SettingsSection>
    </div>
  );
}
