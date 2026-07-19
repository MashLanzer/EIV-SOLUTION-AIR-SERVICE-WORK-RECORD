import { notFound, redirect } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { ReviewTimeline } from "@/components/records/ReviewTimeline";
import { StatusBadge } from "@/components/records/StatusBadge";
import { updateRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getCurrencySymbol } from "@/lib/currency";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { getWorkTypeGroups } from "@/lib/workTypes";
import { requireAuth } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();

  const record = await prisma.workRecord.findFirst({
    where: { id, organizationId: requireOrgId(session) },
    include: {
      photos: { orderBy: { position: "asc" } },
      reviewEvents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, action: true, note: true, actorName: true, createdAt: true },
      },
    },
  });
  if (!record) notFound();

  const isAdmin = session.user.role === "ADMIN";
  // A worker may only edit their own record, and never once it's approved.
  if (!isAdmin && record.submittedById !== session.user.id) notFound();
  if (!isAdmin && record.status === "APPROVED") {
    redirect(`/records/${record.id}`);
  }

  // Workers only pick from their teams' projects, but keep whatever project the
  // record is already tagged to so the association isn't silently dropped.
  const teamIds = isAdmin ? null : await getWorkerTeamIds(session.user.id);
  const projects = await prisma.project.findMany({
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
  });

  const workTypeGroups = await getWorkTypeGroups(requireOrgId(session));
  const currency = await getCurrencySymbol(requireOrgId(session));
  const policy = await prisma.organization.findUnique({
    where: { id: requireOrgId(session) },
    select: { requireHelper: true, requireCustomerSignature: true },
  });
  const boundAction = updateRecordAction.bind(null, record.id);
  const t = await getT();
  const locale = await getLocale();
  const editDateFmt = new Intl.DateTimeFormat(
    locale === "es" ? "es-ES" : "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <PageHeader
          backHref={`/records/${record.id}`}
          backLabel={t.common.back}
          title={`${t.form.editPrefix}${t.records.jobNumber}${record.jobNumber}`}
          description={record.customerName}
          action={<StatusBadge status={record.status} />}
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
          {t.form.jobDate} {editDateFmt.format(record.date)} · {t.form.updated}{" "}
          {editDateFmt.format(record.updatedAt)}
        </p>
      </div>
      {record.status === "NEEDS_CHANGES" && record.reviewNote && (
        <Alert variant="warning">
          <span className="font-medium">{t.form.requestedChanges}</span>{" "}
          {record.reviewNote}
        </Alert>
      )}
      {record.reviewEvents.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <ReviewTimeline events={record.reviewEvents} />
          </CardContent>
        </Card>
      )}
      <WorkRecordForm
        action={boundAction}
        reviewBeforeSubmit
        projects={projects}
        workTypeGroups={workTypeGroups}
        currency={currency}
        requireHelper={policy?.requireHelper ?? false}
        requireCustomerSignature={policy?.requireCustomerSignature ?? true}
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
        submitLabel={t.form.resubmit}
      />
    </div>
  );
}
