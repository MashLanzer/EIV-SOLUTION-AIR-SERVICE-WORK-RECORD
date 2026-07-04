import { notFound } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SuccessToast } from "@/components/ui/success-toast";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { DeleteRecordButton } from "@/components/records/DeleteRecordButton";
import { StatusBadge } from "@/components/records/StatusBadge";
import { approveRecordAction, updateRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";

export default async function AdminEditRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const record = await prisma.workRecord.findUnique({ where: { id } });
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
        <div className="flex gap-2">
          {record.status === "SUBMITTED" && (
            <form action={approveRecordAction.bind(null, record.id)}>
              <Button type="submit" size="sm">
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
            </form>
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
      <CardContent>
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
          }}
          submitLabel="Save Changes"
        />
      </CardContent>
    </Card>
  );
}
