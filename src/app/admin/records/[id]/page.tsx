import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { DeleteRecordButton } from "@/components/records/DeleteRecordButton";
import { updateRecordAction } from "@/actions/records";
import { prisma } from "@/lib/prisma";

export default async function AdminEditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await prisma.workRecord.findUnique({ where: { id } });
  if (!record) notFound();

  const boundAction = updateRecordAction.bind(null, record.id);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Edit Job #{record.jobNumber}</CardTitle>
        <div className="flex gap-2">
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
