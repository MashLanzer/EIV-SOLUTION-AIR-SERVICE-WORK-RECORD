import { notFound } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SuccessToast } from "@/components/ui/success-toast";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { DeleteRecordButton } from "@/components/records/DeleteRecordButton";
import { RequestChangesButton } from "@/components/records/RequestChangesButton";
import { StatusBadge } from "@/components/records/StatusBadge";
import { approveRecordAction, updateRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export default async function AdminEditRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const record = await prisma.workRecord.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { position: "asc" } },
      approvedBy: { select: { name: true } },
    },
  });
  if (!record) notFound();

  const boundAction = updateRecordAction.bind(null, record.id);

  return (
    <Card>
      {saved && <SuccessToast message="Record saved" />}
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <CardTitle>Edit Job #{record.jobNumber}</CardTitle>
          <StatusBadge status={record.status} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {record.status !== "APPROVED" && (
            <form action={approveRecordAction.bind(null, record.id)}>
              <Button type="submit" size="sm">
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
            </form>
          )}
          {record.status === "SUBMITTED" && (
            <RequestChangesButton recordId={record.id} />
          )}
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/records/${record.id}/pdf`}>
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
          <DeleteRecordButton recordId={record.id} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {record.status === "NEEDS_CHANGES" && record.reviewNote && (
          <Alert variant="warning">
            <span className="font-medium">Returned to worker:</span>{" "}
            {record.reviewNote}
          </Alert>
        )}
        {record.status === "APPROVED" && record.approvedAt && (
          <Alert variant="success">
            Approved{record.approvedBy ? ` by ${record.approvedBy.name}` : ""} on{" "}
            {formatDateTime(record.approvedAt)}.
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
          submitLabel="Save Changes"
        />
      </CardContent>
    </Card>
  );
}
