import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { createRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { suggestNextJobNumber } from "@/lib/jobNumber";
import { getWorkTypeGroups } from "@/lib/workTypes";
import { requireOrgId } from "@/lib/orgScope";
import { scheduleWhereForUser } from "@/lib/schedule";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

// The office-side "start a record" flow: an admin files a work record from the
// schedule (or from scratch) and credits it to a specific worker, since the
// attribution drives that worker's pay report. Mirrors the worker's /records/new
// page but adds the attribution picker and pulls from the whole org.
export default async function AdminNewRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const session = await requirePermission("records.edit");
  const organizationId = requireOrgId(session);

  const [projects, org, workers] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId, status: { not: "COMPLETED" } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        customer: { select: { name: true, address: true, phone: true, email: true } },
      },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        defaultLeadPay: true,
        defaultHelperPay: true,
        requirePhoto: true,
        requireHelper: true,
        requireCustomerSignature: true,
        defaultWorkNotes: true,
        currencySymbol: true,
      },
    }),
    prisma.user.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const suggestedJobNumber = await suggestNextJobNumber(organizationId);
  const workTypeGroups = await getWorkTypeGroups(organizationId);
  const t = (await getT()).form;

  // Coming from a scheduled job ("Start record"): pre-fill the customer/project
  // and default the attribution to the job's assigned worker so the office
  // doesn't retype anything.
  const { jobId } = await searchParams;
  let jobPrefill: {
    customerName?: string;
    customerAddress?: string;
    customerPhone?: string;
    customerEmail?: string;
    projectId?: string;
    leadInstallerName?: string;
  } = {};
  let linkedJobId: string | undefined;
  let attributeDefaultId: string | undefined;
  if (jobId) {
    const scope = await scheduleWhereForUser(session, organizationId);
    const job = await prisma.scheduledJob.findFirst({
      where: { AND: [{ id: jobId }, scope] },
      select: {
        projectId: true,
        assignedToId: true,
        assignedTo: { select: { name: true } },
        customer: { select: { name: true, address: true, phone: true, email: true } },
      },
    });
    if (job) {
      linkedJobId = jobId;
      // Default the attribution to the assigned worker when they're still an
      // active member (present in the picker); otherwise leave it unset.
      if (job.assignedToId && workers.some((w) => w.id === job.assignedToId)) {
        attributeDefaultId = job.assignedToId;
      }
      jobPrefill = {
        customerName: job.customer?.name || undefined,
        customerAddress: job.customer?.address || undefined,
        customerPhone: job.customer?.phone || undefined,
        customerEmail: job.customer?.email || undefined,
        projectId:
          job.projectId && projects.some((p) => p.id === job.projectId)
            ? job.projectId
            : undefined,
        leadInstallerName: job.assignedTo?.name || undefined,
      };
    }
  }

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
          jobNumber: suggestedJobNumber || undefined,
          leadInstallerPay:
            org?.defaultLeadPay != null ? String(org.defaultLeadPay) : undefined,
          helperPay:
            org?.defaultHelperPay != null ? String(org.defaultHelperPay) : undefined,
          workPerformedNotes: org?.defaultWorkNotes || undefined,
          ...jobPrefill,
        }}
        submitLabel={t.submitRecord}
        projects={projects}
        requirePhoto={org?.requirePhoto ?? false}
        requireHelper={org?.requireHelper ?? false}
        requireCustomerSignature={org?.requireCustomerSignature ?? true}
        workTypeGroups={workTypeGroups}
        currency={org?.currencySymbol || "$"}
        scheduledJobId={linkedJobId}
        attributeWorkers={workers}
        attributeDefaultId={attributeDefaultId}
        redirectTo="/admin/records"
      />
    </div>
  );
}
