import { notFound } from "next/navigation";
import Link from "next/link";
import { Download, Pencil, Receipt, Star } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { SuccessToast } from "@/components/ui/success-toast";
import { ApproveRecordButton } from "@/components/records/ApproveRecordButton";
import { DeleteRecordButton } from "@/components/records/DeleteRecordButton";
import { RecordDetail } from "@/components/records/RecordDetail";
import { RequestChangesButton } from "@/components/records/RequestChangesButton";
import { ReviewTimeline } from "@/components/records/ReviewTimeline";
import { ShareReceiptButton } from "@/components/records/ShareReceiptButton";
import { StatusBadge } from "@/components/records/StatusBadge";
import { createInvoiceFromRecordAction } from "@/actions/invoices";
import { formatInvoiceNumber } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { requireOrgId } from "@/lib/orgScope";
import { requireReviewer } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";

// A uniform action tile (icon over a short label) shared by the record's
// primary actions so they read as one tidy, compact row.
const ACTION_TILE =
  "flex flex-col items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white px-1 py-2 text-center text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";

function formatDateTime(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
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
  const session = await requireReviewer();
  const { id } = await params;
  const { saved } = await searchParams;
  const record = await prisma.workRecord.findFirst({
    where: { id, organizationId: requireOrgId(session) },
    include: {
      photos: { orderBy: { position: "asc" } },
      approvedBy: { select: { name: true } },
      customer: { select: { phone: true, email: true } },
      reviewEvents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, action: true, note: true, actorName: true, createdAt: true },
      },
      // The invoice generated from this record, if any (admins only act on it).
      invoices: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { id: true, number: true },
      },
    },
  });
  if (!record) notFound();
  const isAdmin = session.user.role === "ADMIN";
  const linkedInvoice = record.invoices[0] ?? null;
  const currency = await getCurrencySymbol(requireOrgId(session));
  const dict = await getT();
  const t = dict.adminRecords;
  const locale = await getLocale();

  const summaryDate = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(record.date);

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message={dict.records.recordSaved} aboveMobileNav />}

      {/* Header: identity + status, a quick summary line, and the review
          actions - Approve/Return get prominence, the rest are secondary. */}
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {dict.records.jobNumber}{record.jobNumber}
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

          {/* Actions as uniform tiles (icon over a short label) instead of a
              wrapping button row; secondary flows (share) open in a sheet and
              delete is a quiet ghost row, so the card stays compact. */}
          <div className="flex flex-col gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-3">
            <div className="grid grid-cols-4 gap-2">
              <Link href={`/admin/records/${record.id}/edit`} className={ACTION_TILE}>
                <Pencil className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                <span className="text-[11px] font-medium leading-tight">{dict.common.edit}</span>
              </Link>
              <a href={`/admin/records/${record.id}/pdf`} className={ACTION_TILE}>
                <Download className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                <span className="text-[11px] font-medium leading-tight">
                  {dict.records.downloadPdf}
                </span>
              </a>
              <ShareReceiptButton
                recordId={record.id}
                initialToken={record.publicToken}
                initialExpiresAt={record.publicTokenExpiresAt?.toISOString() ?? null}
                customerPhone={record.customer?.phone ?? null}
                customerEmail={record.customer?.email ?? null}
                className={ACTION_TILE}
              />
              {isAdmin &&
                (linkedInvoice ? (
                  <Link href={`/admin/invoices/${linkedInvoice.id}`} className={ACTION_TILE}>
                    <Receipt className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                    <span className="truncate text-[11px] font-medium leading-tight">
                      {formatInvoiceNumber(linkedInvoice.number)}
                    </span>
                  </Link>
                ) : (
                  <form action={createInvoiceFromRecordAction.bind(null, record.id)}>
                    <button type="submit" className={cn(ACTION_TILE, "w-full")}>
                      <Receipt className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                      <span className="text-[11px] font-medium leading-tight">
                        {dict.invoices.createInvoice}
                      </span>
                    </button>
                  </form>
                ))}
            </div>
            <div className="flex justify-end">
              <DeleteRecordButton recordId={record.id} subtle />
            </div>
          </div>
        </CardContent>
      </Card>

      {record.status === "NEEDS_CHANGES" && record.reviewNote && (
        <Alert variant="warning">
          <span className="font-medium">{t.returnedToWorker}</span>{" "}
          {record.reviewNote}
        </Alert>
      )}
      {record.status === "APPROVED" && record.approvedAt && (
        <Alert variant="success">
          {(record.approvedBy ? t.approvedByOn : t.approvedOn)
            .replace("{name}", record.approvedBy?.name ?? "")
            .replace("{date}", formatDateTime(record.approvedAt, locale))}
        </Alert>
      )}

      {record.customerRating && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.customerRatingLabel}
            </span>
            <span className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={
                    n <= record.customerRating!
                      ? "h-4 w-4 fill-amber-400 text-amber-400"
                      : "h-4 w-4 text-neutral-300 dark:text-neutral-600"
                  }
                />
              ))}
            </span>
            {record.customerFeedback && (
              <span className="w-full text-sm text-neutral-600 dark:text-neutral-300">
                “{record.customerFeedback}”
              </span>
            )}
          </CardContent>
        </Card>
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
