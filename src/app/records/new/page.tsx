import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { createRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { suggestNextJobNumber } from "@/lib/jobNumber";
import { getWorkTypeGroups } from "@/lib/workTypes";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export default async function NewRecordPage() {
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {t.newRecordTitle}
      </h1>
      <WorkRecordForm
        action={createRecordAction}
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
        }}
        submitLabel={t.submitRecord}
        draftKey={`new-record:${session.user.id}`}
        projects={projects}
        requirePhoto={org?.requirePhoto ?? false}
        requireHelper={org?.requireHelper ?? false}
        requireCustomerSignature={org?.requireCustomerSignature ?? true}
        workTypeGroups={workTypeGroups}
        currency={org?.currencySymbol || "$"}
      />
    </div>
  );
}
