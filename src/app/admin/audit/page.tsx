import { Contact, FolderKanban, History, Receipt, Settings } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getAuditLog } from "@/lib/audit";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";

const ICON: Record<string, typeof Contact> = {
  customer: Contact,
  project: FolderKanban,
  invoice: Receipt,
  settings: Settings,
};

export default async function AuditPage() {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  const events = await getAuditLog(organizationId);

  const t = (await getT()).audit;
  const locale = await getLocale();
  const fmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.title} description={t.desc} />

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={History} title={t.empty} description={t.emptyDesc} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-neutral-100 p-4 dark:divide-neutral-800">
            {events.map((e) => {
              const Icon = ICON[e.entityType] ?? History;
              return (
                <div key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">{e.summary}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {t.by.replace("{name}", e.actorName)} · {fmt.format(e.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
