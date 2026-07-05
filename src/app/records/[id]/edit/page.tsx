import { notFound, redirect } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { StatusBadge } from "@/components/records/StatusBadge";
import { updateRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();

  const record = await prisma.workRecord.findUnique({
    where: { id },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  if (!record) notFound();

  const isAdmin = session.user.role === "ADMIN";
  // A worker may only edit their own record, and never once it's approved.
  if (!isAdmin && record.submittedById !== session.user.id) notFound();
  if (!isAdmin && record.status === "APPROVED") {
    redirect(`/records/${record.id}`);
  }

  const boundAction = updateRecordAction.bind(null, record.id);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Edit Job #{record.jobNumber}</CardTitle>
        <StatusBadge status={record.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {record.status === "NEEDS_CHANGES" && record.reviewNote && (
          <Alert variant="warning">
            <span className="font-medium">Requested changes:</span>{" "}
            {record.reviewNote}
          </Alert>
        )}
        <WorkRecordForm
          action={boundAction}
          defaultValues={{
            date: record.date.toISOString().slice(0, 10),
            jobNumber: record.jobNumber,
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
          submitLabel="Resubmit"
        />
      </CardContent>
    </Card>
  );
}
