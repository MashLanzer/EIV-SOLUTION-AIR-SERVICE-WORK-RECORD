import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, FolderKanban } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SuccessToast } from "@/components/ui/success-toast";
import { RecordDetail } from "@/components/records/RecordDetail";
import { ReviewTimeline } from "@/components/records/ReviewTimeline";
import { SameCustomerRecordsSheet } from "@/components/records/SameCustomerRecordsSheet";
import { StatusBadge } from "@/components/records/StatusBadge";
import { WorkerRecordEditSheet } from "@/components/records/WorkerRecordEditSheet";
import { updateRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { getWorkTypeGroups } from "@/lib/workTypes";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";

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
      project: { select: { id: true, name: true } },
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

  // The same author's other visits to this customer, for the "other records for
  // this customer" sheet — keyed by customerId when the record is linked to a
  // saved customer, else by the denormalized name. Skipped when the author is
  // gone (submittedById cleared on worker delete).
  const sameCustomerRecords = record.submittedById
    ? await prisma.workRecord.findMany({
        where: {
          organizationId: requireOrgId(session),
          submittedById: record.submittedById,
          id: { not: record.id },
          ...(record.customerId
            ? { customerId: record.customerId }
            : { customerName: record.customerName }),
        },
        select: { id: true, jobNumber: true, date: true, typeOfWork: true, status: true },
        orderBy: { date: "desc" },
        take: 20,
      })
    : [];

  const canEdit = record.status !== "APPROVED";
  const currency = await getCurrencySymbol(requireOrgId(session));
  const t = await getT();
  const locale = await getLocale();
  const summaryDate = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(record.date);

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

      {/* Header card: identity + status, a quick summary line, and the worker's
          actions under a divider — mirrors the admin review header so both sides
          of the app read the same. */}
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {t.records.jobNumber}
                {record.jobNumber}
              </h1>
              <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                {record.customerName} · {summaryDate} · {record.typeOfWork}
              </p>
            </div>
            <StatusBadge status={record.status} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
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
        </CardContent>
      </Card>

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

      {/* Related links: jump to the tagged project and to the worker's other
          records for this customer, so the detail isn't a dead end. */}
      {(record.project || sameCustomerRecords.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {record.project && (
            <Link
              href={`/records/projects/${record.project.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-neutral-500 dark:text-neutral-400">{t.records.inProjectLabel}:</span>
              <span className="max-w-[12rem] truncate">{record.project.name}</span>
            </Link>
          )}
          <SameCustomerRecordsSheet
            customerName={record.customerName}
            records={sameCustomerRecords}
          />
        </div>
      )}

      <RecordDetail record={record} currency={currency} showCustomerContact={false} />

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
