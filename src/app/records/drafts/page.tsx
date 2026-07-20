import { PageHeader } from "@/components/ui/page-header";
import { DraftsInbox } from "@/components/records/DraftsInbox";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function WorkerDraftsPage() {
  await requireAuth();
  const t = (await getT()).drafts;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.title} description={t.subtitle} backHref="/records" backLabel={t.back} />
      <DraftsInbox />
    </div>
  );
}
