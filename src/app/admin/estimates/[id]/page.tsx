import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, FolderKanban, Pencil, User } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstimateStatusBadge } from "@/components/estimates/EstimateStatusBadge";
import { EstimateStatusControls } from "@/components/estimates/EstimateStatusControls";
import { ShareEstimateButton } from "@/components/estimates/ShareEstimateButton";
import { ConvertEstimateButton } from "@/components/estimates/ConvertEstimateButton";
import { EmailToCustomerButton } from "@/components/shared/EmailToCustomerButton";
import { duplicateEstimateAction, emailEstimateAction } from "@/actions/estimates";
import { DeleteEstimateButton } from "@/components/estimates/DeleteEstimateButton";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { computeTotals, formatInvoiceNumber } from "@/lib/invoices";
import { formatEstimateNumber, isEstimateExpired } from "@/lib/estimates";
import { requireOrgId } from "@/lib/orgScope";
import { requireFeature } from "@/lib/features";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("estimates.manage");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "estimates");
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId },
    include: {
      lineItems: { orderBy: { position: "asc" } },
      customer: { select: { id: true } },
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      convertedInvoice: { select: { id: true, number: true } },
    },
  });
  if (!estimate) notFound();

  const dict = await getT();
  const t = dict.estimates;
  const locale = await getLocale();
  const currency = await getCurrencySymbol(organizationId);
  const money = (n: number) => `${currency}${n.toFixed(2)}`;
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const totals = computeTotals(
    estimate.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
    Number(estimate.taxRate)
  );
  const converted = estimate.convertedInvoice;
  const locked = Boolean(converted);
  const expired = isEstimateExpired(estimate.status, estimate.expiryDate);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backHref="/admin/estimates"
        backLabel={t.backToEstimates}
        title={formatEstimateNumber(estimate.number)}
        action={
          !locked ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/estimates/${estimate.id}/edit`}>
                <Pencil className="h-4 w-4" />
                {t.edit}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <EstimateStatusBadge status={estimate.status} />
              {expired && <span className="text-sm font-medium text-warning-text">{t.expired}</span>}
            </div>
            <EstimateStatusControls estimateId={estimate.id} status={estimate.status} />
          </div>

          {/* Convert to invoice — the sales→billing bridge */}
          {converted ? (
            <Alert variant="success">
              <Link href={`/admin/invoices/${converted.id}`} className="font-medium underline">
                {t.convertedTo.replace("{number}", formatInvoiceNumber(converted.number))}
              </Link>
            </Alert>
          ) : (
            <ConvertEstimateButton estimateId={estimate.id} />
          )}

          <div className="grid gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.quoteFor}
              </div>
              <div className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                {estimate.customer ? (
                  <Link
                    href={`/admin/customers/${estimate.customer.id}`}
                    className="inline-flex items-center gap-1.5 hover:text-primary"
                  >
                    <User className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    {estimate.customerName}
                  </Link>
                ) : (
                  estimate.customerName
                )}
              </div>
              {estimate.customerAddress && (
                <div className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  {estimate.customerAddress}
                </div>
              )}
              {estimate.project && (
                <Link
                  href={`/admin/projects/${estimate.project.id}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary dark:text-neutral-400"
                >
                  <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                  {estimate.project.name}
                </Link>
              )}
            </div>
            <div className="sm:text-right text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
              <div>
                {t.issued}: {dateFmt.format(estimate.issueDate)}
              </div>
              {estimate.expiryDate && (
                <div>
                  <span>{t.expires}: </span>
                  <span className={expired ? "font-medium text-warning-text" : undefined}>
                    {dateFmt.format(estimate.expiryDate)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-fade-up" style={{ animationDelay: "40ms", animationFillMode: "both" }}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.descriptionPlaceholder}</TableHead>
                <TableHead className="text-right">{t.qty}</TableHead>
                <TableHead className="text-right">{t.unitPrice}</TableHead>
                <TableHead className="text-right">{t.amount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimate.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell className="text-neutral-900 dark:text-neutral-100">{li.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(li.quantity)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(Number(li.unitPrice))}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(Number(li.quantity) * Number(li.unitPrice))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{t.subtotal}</span>
              <span className="tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                {t.tax} ({Number(estimate.taxRate)}%)
              </span>
              <span className="tabular-nums">{money(totals.tax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-base font-semibold dark:border-neutral-800">
              <span>{t.total}</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {estimate.notes && (
        <Card className="animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.notes}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">
              {estimate.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {locked && <Alert variant="info">{t.lockedNote}</Alert>}

      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {estimate.createdBy?.name
            ? t.createdBy.replace("{name}", estimate.createdBy.name)
            : formatEstimateNumber(estimate.number)}
        </h2>
        <ShareEstimateButton estimateId={estimate.id} initialToken={estimate.publicToken} />
        <form action={duplicateEstimateAction.bind(null, estimate.id)}>
          <Button type="submit" variant="outline" className="w-full">
            <Copy className="h-4 w-4" />
            {t.duplicate}
          </Button>
        </form>
        <EmailToCustomerButton
          action={emailEstimateAction.bind(null, estimate.id)}
          label={t.emailToCustomer}
          sendingLabel={t.emailSending}
          sentLabel={t.emailSent}
          errors={{
            no_email: t.emailNoEmail,
            not_configured: t.emailNotConfigured,
            not_found: t.emailError,
            default: t.emailError,
          }}
        />
        <div>
          <DeleteEstimateButton estimateId={estimate.id} />
        </div>
      </section>
    </div>
  );
}
