import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";

import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { PageHeader } from "@/components/ui/page-header";
import { createRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { suggestNextJobNumber } from "@/lib/jobNumber";
import { getWorkTypeGroups } from "@/lib/workTypes";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { scheduleWhereForUser } from "@/lib/schedule";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export default async function NewRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string; projectId?: string }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  // Workers can only tag a record to a project of one of their teams.
  const isAdmin = session.user.role === "ADMIN";
  const teamIds = isAdmin ? null : await getWorkerTeamIds(session.user.id);
  const [projects, org] = await Promise.all([
    prisma.project.findMany({
      where: {
        organizationId,
        status: { not: "COMPLETED" },
        ...(isAdmin ? {} : { teamId: { in: teamIds ?? [] } }),
      },
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
  ]);
  const suggestedJobNumber = await suggestNextJobNumber(organizationId);
  const workTypeGroups = await getWorkTypeGroups(organizationId);
  const t = (await getT()).form;

  // Coming from a scheduled job ("Start record"): pre-fill the customer and
  // project from the plan so the crew doesn't retype them. Role-scoped so a
  // worker can only seed from a job that's theirs. A saved draft still wins.
  const { jobId, projectId } = await searchParams;
  let jobPrefill: {
    customerName?: string;
    customerAddress?: string;
    customerPhone?: string;
    customerEmail?: string;
    projectId?: string;
  } = {};
  // Only thread the job id through to the record on submit once we've confirmed
  // the job is real and the worker's - keeps a bogus ?jobId from linking.
  let linkedJobId: string | undefined;
  if (jobId) {
    const scope = await scheduleWhereForUser(session, organizationId);
    const job = await prisma.scheduledJob.findFirst({
      where: { AND: [{ id: jobId }, scope] },
      select: {
        projectId: true,
        customer: { select: { name: true, address: true, phone: true, email: true } },
      },
    });
    if (job) {
      linkedJobId = jobId;
      jobPrefill = {
        customerName: job.customer?.name || undefined,
        customerAddress: job.customer?.address || undefined,
        customerPhone: job.customer?.phone || undefined,
        customerEmail: job.customer?.email || undefined,
        // Only seed the project when the worker may pick it (it's in the
        // team-scoped list the form renders).
        projectId:
          job.projectId && projects.some((p) => p.id === job.projectId)
            ? job.projectId
            : undefined,
      };
    }
  }

  // Coming from a project ("Start a record here"): pre-select the project and
  // seed its customer. Only honored when the project is in the worker's own
  // team-scoped list (that membership is the access check), and a job hasn't
  // already seeded these.
  if (projectId && !jobPrefill.projectId) {
    const proj = projects.find((p) => p.id === projectId);
    if (proj) {
      jobPrefill.projectId = proj.id;
      jobPrefill.customerName ??= proj.customer?.name || undefined;
      jobPrefill.customerAddress ??= proj.customer?.address || undefined;
      jobPrefill.customerPhone ??= proj.customer?.phone || undefined;
      jobPrefill.customerEmail ??= proj.customer?.email || undefined;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.newRecordTitle}
        backHref={linkedJobId ? "/records/schedule" : undefined}
        backLabel={linkedJobId ? t.backToSchedule : undefined}
      />
      {linkedJobId && jobPrefill.customerName && (
        <Link
          href="/records/schedule"
          className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/50 dark:hover:border-neutral-700"
        >
          <CalendarClock className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-200">
            <span className="text-neutral-500 dark:text-neutral-400">{t.fromScheduledJob}</span>
            {" · "}
            <span className="font-medium">{jobPrefill.customerName}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
        </Link>
      )}
      <WorkRecordForm
        action={createRecordAction}
        reviewBeforeSubmit
        storedSignature={session.user.storedSignature}
        defaultValues={{
          leadInstallerName: session.user.name ?? "",
          // Suggested next sequential job number (blank if the org doesn't
          // use numeric ones); a saved draft still wins.
          jobNumber: suggestedJobNumber || undefined,
          // Company defaults from Settings pre-fill the pay fields; a saved
          // draft (loaded in the form) still wins over these.
          leadInstallerPay:
            org?.defaultLeadPay != null ? String(org.defaultLeadPay) : undefined,
          helperPay:
            org?.defaultHelperPay != null ? String(org.defaultHelperPay) : undefined,
          // Company notes template (Settings) seeds the notes on a fresh
          // record; a saved draft still wins.
          workPerformedNotes: org?.defaultWorkNotes || undefined,
          // Customer/project seeded from a scheduled job, when starting from one.
          ...jobPrefill,
        }}
        submitLabel={t.submitRecord}
        draftKey={`new-record:${session.user.id}`}
        projects={projects}
        requirePhoto={org?.requirePhoto ?? false}
        requireHelper={org?.requireHelper ?? false}
        requireCustomerSignature={org?.requireCustomerSignature ?? true}
        workTypeGroups={workTypeGroups}
        currency={org?.currencySymbol || "$"}
        scheduledJobId={linkedJobId}
      />
    </div>
  );
}
