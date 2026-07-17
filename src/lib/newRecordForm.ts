import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { suggestNextJobNumber } from "@/lib/jobNumber";
import { getWorkTypeGroups } from "@/lib/workTypes";
import { scheduleWhereForUser } from "@/lib/schedule";
import type { requireAuth } from "@/lib/session";

type Session = Awaited<ReturnType<typeof requireAuth>>;

// Everything the office "new work record" form needs, plus any prefill/attribution
// derived from a scheduled job. Shared by the /admin/records/new page and the
// "start record" bottom sheet on the calendar so both stay in sync.
export interface NewRecordFormData {
  projects: {
    id: string;
    name: string;
    customer: { name: string; address: string; phone: string | null; email: string | null } | null;
  }[];
  org: {
    defaultLeadPay: Prisma.Decimal | null;
    defaultHelperPay: Prisma.Decimal | null;
    requirePhoto: boolean;
    requireHelper: boolean;
    requireCustomerSignature: boolean;
    defaultWorkNotes: string | null;
    currencySymbol: string | null;
  } | null;
  workers: { id: string; name: string }[];
  suggestedJobNumber: string;
  workTypeGroups: Awaited<ReturnType<typeof getWorkTypeGroups>>;
  linkedJobId?: string;
  attributeDefaultId?: string;
  jobPrefill: {
    customerName?: string;
    customerAddress?: string;
    customerPhone?: string;
    customerEmail?: string;
    projectId?: string;
    leadInstallerName?: string;
  };
}

export async function loadNewRecordFormData(
  session: Session,
  organizationId: string,
  jobId?: string
): Promise<NewRecordFormData> {
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

  let jobPrefill: NewRecordFormData["jobPrefill"] = {};
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

  return {
    projects,
    org,
    workers,
    suggestedJobNumber,
    workTypeGroups,
    linkedJobId,
    attributeDefaultId,
    jobPrefill,
  };
}
