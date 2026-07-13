import { notFound } from "next/navigation";
import Link from "next/link";
import { Download, Pencil } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SuccessToast } from "@/components/ui/success-toast";
import { RecordDetail } from "@/components/records/RecordDetail";
import { ReviewTimeline } from "@/components/records/ReviewTimeline";
import { StatusBadge } from "@/components/records/StatusBadge";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
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

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message={t.records.recordSaved} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {t.records.jobNumber}
            {record.jobNumber}
          </h1>
          <StatusBadge status={record.status} />
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {canEdit && (
            <Button asChild size="sm">
              <Link href={`/records/${record.id}/edit`}>
                <Pencil className="h-4 w-4" />
                {t.common.edit}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={`/records/${record.id}/pdf`}>
              <Download className="h-4 w-4" />
              {t.records.downloadPdf}
            </a>
          </Button>
        </div>
      </div>

      {record.status === "NEEDS_CHANGES" && (
        <Alert variant="warning">
          <span className="font-medium">
            {t.records.supervisorAskedChanges}
          </span>{" "}
          {record.reviewNote
            ? record.reviewNote
            : t.records.pleaseReviewResubmit}{" "}
          {t.records.tapEditPrefix}
          <span className="font-medium">{t.common.edit}</span>
          {t.records.tapEditSuffix}
        </Alert>
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
