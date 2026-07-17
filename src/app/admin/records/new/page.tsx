import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { createRecordAction } from "@/actions/records";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { loadNewRecordFormData } from "@/lib/newRecordForm";
import { getT } from "@/lib/i18n/server";

// The office-side "start a record" flow: an admin files a work record from the
// schedule (or from scratch) and credits it to a specific worker, since the
// attribution drives that worker's pay report. Lead installer / helper /
// customer are dropdowns here (see WorkRecordForm's office mode).
export default async function AdminNewRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const session = await requirePermission("records.edit");
  const organizationId = requireOrgId(session);
  const { jobId } = await searchParams;
  const data = await loadNewRecordFormData(session, organizationId, jobId);
  const t = (await getT()).form;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/schedule"
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.backToSchedule}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            <ClipboardList className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t.newRecordTitle}
          </h1>
        </div>
      </div>

      <WorkRecordForm
        action={createRecordAction}
        storedSignature={session.user.storedSignature}
        defaultValues={{
          jobNumber: data.suggestedJobNumber || undefined,
          leadInstallerPay:
            data.org?.defaultLeadPay != null ? String(data.org.defaultLeadPay) : undefined,
          helperPay:
            data.org?.defaultHelperPay != null ? String(data.org.defaultHelperPay) : undefined,
          workPerformedNotes: data.org?.defaultWorkNotes || undefined,
          ...data.jobPrefill,
        }}
        submitLabel={t.submitRecord}
        projects={data.projects}
        requirePhoto={data.org?.requirePhoto ?? false}
        requireHelper={data.org?.requireHelper ?? false}
        requireCustomerSignature={data.org?.requireCustomerSignature ?? true}
        workTypeGroups={data.workTypeGroups}
        currency={data.org?.currencySymbol || "$"}
        scheduledJobId={data.linkedJobId}
        attributeWorkers={data.workers}
        attributeDefaultId={data.attributeDefaultId}
        customerOptions={data.customers}
        redirectTo="/admin/records"
      />
    </div>
  );
}
