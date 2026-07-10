import { notFound } from "next/navigation";
import Link from "next/link";
import { Download, Pencil } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SuccessToast } from "@/components/ui/success-toast";
import { ApproveRecordButton } from "@/components/records/ApproveRecordButton";
import { DeleteRecordButton } from "@/components/records/DeleteRecordButton";
import { RecordDetail } from "@/components/records/RecordDetail";
import { RequestChangesButton } from "@/components/records/RequestChangesButton";
import { StatusBadge } from "@/components/records/StatusBadge";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export default async function AdminReviewRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const record = await prisma.workRecord.findFirst({
    where: { id, organizationId: requireOrgId(session) },
    include: {
      photos: { orderBy: { position: "asc" } },
      approvedBy: { select: { name: true } },
    },
  });
  if (!record) notFound();

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message="Record saved" aboveMobileNav />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            Job #{record.jobNumber}
          </h1>
          <StatusBadge status={record.status} />
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {record.status !== "APPROVED" && (
            <ApproveRecordButton recordId={record.id} />
          )}
          {record.status === "SUBMITTED" && (
            <RequestChangesButton recordId={record.id} />
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/records/${record.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/records/${record.id}/pdf`}>
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
          <DeleteRecordButton recordId={record.id} />
        </div>
      </div>

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

      <Card>
        <CardContent className="p-4">
          <RecordDetail record={record} />
        </CardContent>
      </Card>
    </div>
  );
}
