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
import { getCurrencySymbol } from "@/lib/currency";
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
  const currency = await getCurrencySymbol(requireOrgId(session));

  const summaryDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(record.date);

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message="Record saved" aboveMobileNav />}

      {/* Header: identity + status, a quick summary line, and the review
          actions - Approve/Return get prominence, the rest are secondary. */}
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                Job #{record.jobNumber}
              </h1>
              <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                {record.customerName} · {summaryDate} · {record.typeOfWork}
              </p>
            </div>
            <StatusBadge status={record.status} />
          </div>

          {record.status !== "APPROVED" && (
            <div className="flex gap-2">
              <ApproveRecordButton recordId={record.id} size="lg" className="flex-1" />
              {record.status === "SUBMITTED" && (
                <RequestChangesButton
                  recordId={record.id}
                  size="lg"
                  className="flex-1"
                />
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-3">
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
            <div className="ml-auto">
              <DeleteRecordButton recordId={record.id} />
            </div>
          </div>
        </CardContent>
      </Card>

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

      <RecordDetail record={record} currency={currency} />
    </div>
  );
}
