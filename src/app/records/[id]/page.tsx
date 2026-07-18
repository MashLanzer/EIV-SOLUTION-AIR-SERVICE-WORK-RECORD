import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SuccessToast } from "@/components/ui/success-toast";
import { RecordDetail } from "@/components/records/RecordDetail";
import { ReviewTimeline } from "@/components/records/ReviewTimeline";
import { StatusBadge } from "@/components/records/StatusBadge";
import { WorkerRecordEditSheet } from "@/components/records/WorkerRecordEditSheet";
import { updateRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { getWorkTypeGroups } from "@/lib/workTypes";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export default async function RecordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const session = await requireAuth();

  const record = await prisma.workRecord.findFirst({
    where: { id, organizationId: requireOrgId(session) },
    include: {
      photos: { orderBy: { position: "asc" } },
      customer: { select: { phone: true, email: true } },
      reviewEvents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, action: true, note: true, actorName: true, createdAt: true },
      },
    },
  });
  if (!record) notFound();
  if (session.user.role !== "ADMIN" && record.submittedById !== session.user.id) {
    notFound();
  }

  const canEdit = record.status !== "APPROVED";
  const currency = await getCurrencySymbol(requireOrgId(session));
  const t = await getT();

  // Data for the edit sheet's WorkRecordForm (only when editable). Workers only
  // pick from their teams' projects, keeping whatever project is already tagged.
  const isAdmin = session.user.role === "ADMIN";
  let editFormProps: React.ComponentProps<typeof WorkerRecordEditSheet>["formProps"] | null = null;
  if (canEdit) {
    const teamIds = isAdmin ? null : await getWorkerTeamIds(session.user.id);
    const [projects, workTypeGroups, policy] = await Promise.all([
      prisma.project.findMany({
        where: {
          organizationId: requireOrgId(session),
          ...(isAdmin
            ? {}
            : {
                OR: [
                  { teamId: { in: teamIds ?? [] } },
                  ...(record.projectId ? [{ id: record.projectId }] : []),
                ],
              }),
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          customer: { select: { name: true, address: true, phone: true, email: true } },
        },
      }),
      getWorkTypeGroups(requireOrgId(session)),
      prisma.organization.findUnique({
        where: { id: requireOrgId(session) },
        select: { requireHelper: true, requireCustomerSignature: true },
      }),
    ]);
    editFormProps = {
      action: updateRecordAction.bind(null, record.id),
      projects,
      workTypeGroups,
      currency,
      requireHelper: policy?.requireHelper ?? false,
      requireCustomerSignature: policy?.requireCustomerSignature ?? true,
      submitLabel: t.common.save,
      defaultValues: {
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
      },
    };
  }
  const editTitle = `${t.form.editPrefix}${t.records.jobNumber}${record.jobNumber}`;

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message={t.records.recordSaved} />}

      <Link
        href="/records"
        className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {t.records.backToRecords}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {t.records.jobNumber}
            {record.jobNumber}
          </h1>
          <StatusBadge status={record.status} />
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {canEdit && editFormProps && (
            <WorkerRecordEditSheet variant="edit" title={editTitle} formProps={editFormProps} />
          )}
          <Button asChild variant="outline" size="sm">
            <a href={`/records/${record.id}/pdf`}>
              <Download className="h-4 w-4" />
              {t.records.downloadPdf}
            </a>
          </Button>
        </div>
      </div>

      {record.status === "APPROVED" && (
        <Alert variant="success">
          <span className="font-medium">{t.records.approvedLockedTitle}</span>{" "}
          {t.records.approvedLockedDesc}
        </Alert>
      )}

      {record.status === "NEEDS_CHANGES" && (
        <div className="flex flex-col gap-3">
          <Alert variant="warning">
            <span className="font-medium">
              {t.records.supervisorAskedChanges}
            </span>{" "}
            {record.reviewNote
              ? record.reviewNote
              : t.records.pleaseReviewResubmit}
          </Alert>
          {canEdit && editFormProps && (
            <WorkerRecordEditSheet variant="resubmit" title={editTitle} formProps={editFormProps} />
          )}
        </div>
      )}

      <RecordDetail record={record} currency={currency} />

      {record.reviewEvents.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <ReviewTimeline events={record.reviewEvents} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
