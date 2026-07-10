import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { createRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";

export default async function NewRecordPage() {
  const session = await requireAuth();
  const projects = await prisma.project.findMany({
    where: { organizationId: requireOrgId(session), status: { not: "COMPLETED" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        New Work Record
      </h1>
      <WorkRecordForm
        action={createRecordAction}
        defaultValues={{ leadInstallerName: session.user.name ?? "" }}
        submitLabel="Submit Record"
        draftKey={`new-record:${session.user.id}`}
        projects={projects}
      />
    </div>
  );
}
