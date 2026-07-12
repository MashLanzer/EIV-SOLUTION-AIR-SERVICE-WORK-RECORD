import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { createRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { suggestNextJobNumber } from "@/lib/jobNumber";
import { getWorkTypeGroups } from "@/lib/workTypes";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";

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
      },
    }),
  ]);
  const suggestedJobNumber = await suggestNextJobNumber(organizationId);
  const workTypeGroups = await getWorkTypeGroups(organizationId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        New Work Record
      </h1>
      <WorkRecordForm
        action={createRecordAction}
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
        }}
        submitLabel="Submit Record"
        draftKey={`new-record:${session.user.id}`}
        projects={projects}
        requirePhoto={org?.requirePhoto ?? false}
        workTypeGroups={workTypeGroups}
      />
    </div>
  );
}
