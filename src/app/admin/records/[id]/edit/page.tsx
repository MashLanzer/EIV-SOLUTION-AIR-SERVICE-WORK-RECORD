import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { StatusBadge } from "@/components/records/StatusBadge";
import { updateRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkTypeGroups } from "@/lib/workTypes";
import { requireAdmin } from "@/lib/session";

const editDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminEditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  const record = await prisma.workRecord.findFirst({
    where: { id, organizationId: requireOrgId(session) },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  if (!record) notFound();

  const projects = await prisma.project.findMany({
    where: { organizationId: requireOrgId(session) },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      customer: { select: { name: true, address: true, phone: true, email: true } },
    },
  });

  const workTypeGroups = await getWorkTypeGroups(requireOrgId(session));
  const currency = await getCurrencySymbol(requireOrgId(session));
  const boundAction = updateRecordAction.bind(null, record.id);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={`/admin/records/${record.id}`}
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to review
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              Edit Job #{record.jobNumber}
            </h1>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                {record.customerName}
              </p>
              <StatusBadge status={record.status} />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
          Job date {editDateFmt.format(record.date)} · Updated{" "}
          {editDateFmt.format(record.updatedAt)}
        </p>
      </div>

      {record.status === "NEEDS_CHANGES" && record.reviewNote && (
        <Alert variant="warning">
          <span className="font-medium">Returned to worker:</span>{" "}
          {record.reviewNote}
        </Alert>
      )}

      <WorkRecordForm
        action={boundAction}
        projects={projects}
        workTypeGroups={workTypeGroups}
        currency={currency}
        defaultValues={{
          date: record.date.toISOString().slice(0, 10),
          jobNumber: record.jobNumber,
          projectId: record.projectId ?? "",
          leadInstallerName: record.leadInstallerName,
          helperName: record.helperName ?? "",
          customerName: record.customerName,
          customerAddress: record.customerAddress,
          arrivalTime: record.arrivalTime,
          departureTime: record.departureTime,
          typeOfWork: record.typeOfWork,
          workPerformedNotes: record.workPerformedNotes,
          leadInstallerPay: record.leadInstallerPay.toString(),
          helperPay: record.helperPay?.toString() ?? "",
          customerSignature: record.customerSignature,
          installerSignature: record.installerSignature,
          photos: record.photos.map((p) => p.dataUrl),
        }}
        submitLabel="Save Changes"
      />
    </div>
  );
}
