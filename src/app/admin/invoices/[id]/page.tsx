import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Download, FolderKanban, Pencil, User } from "lucide-react";

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
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvoiceStatusControls } from "@/components/invoices/InvoiceStatusControls";
import { ShareInvoiceButton } from "@/components/invoices/ShareInvoiceButton";
import { EmailToCustomerButton } from "@/components/shared/EmailToCustomerButton";
import { duplicateInvoiceAction, emailInvoiceAction } from "@/actions/invoices";
import { DeleteInvoiceButton } from "@/components/invoices/DeleteInvoiceButton";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { computeTotals, formatInvoiceNumber, isOverdue } from "@/lib/invoices";
import { requireOrgId } from "@/lib/orgScope";
import { requireFeature } from "@/lib/features";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "invoicing");
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: {
      lineItems: { orderBy: { position: "asc" } },
      customer: { select: { id: true } },
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!invoice) notFound();

  const dict = await getT();
  const t = dict.invoices;
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
    invoice.lineItems.map((li) => ({
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
    })),
    Number(invoice.taxRate)
  );
  const locked = invoice.status === "PAID" || invoice.status === "VOID";
  const overdue = isOverdue(invoice.status, invoice.dueDate);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backHref="/admin/invoices"
        backLabel={t.backToInvoices}
        title={formatInvoiceNumber(invoice.number)}
        action={
          <div className="flex flex-wrap gap-2">
            {!locked && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/invoices/${invoice.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  {t.edit}
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <a href={`/admin/invoices/${invoice.id}/pdf`}>
                <Download className="h-4 w-4" />
                {t.downloadPdf}
              </a>
            </Button>
          </div>
        }
      />

      {/* Status + who's billed */}
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              {overdue && (
                <span className="text-sm font-medium text-warning-text">{t.overdue}</span>
              )}
            </div>
            <InvoiceStatusControls invoiceId={invoice.id} status={invoice.status} />
          </div>

          <div className="grid gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.billTo}
              </div>
              <div className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                {invoice.customer ? (
                  <Link
                    href={`/admin/customers/${invoice.customer.id}`}
                    className="inline-flex items-center gap-1.5 hover:text-primary"
                  >
                    <User className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    {invoice.customerName}
                  </Link>
                ) : (
                  invoice.customerName
                )}
              </div>
              {invoice.customerAddress && (
                <div className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  {invoice.customerAddress}
                </div>
              )}
              {invoice.project && (
                <Link
                  href={`/admin/projects/${invoice.project.id}`}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary dark:text-neutral-400"
                >
                  <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                  {invoice.project.name}
                </Link>
              )}
            </div>
            <div className="sm:text-right">
              <div className="text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
                {t.issued}: {dateFmt.format(invoice.issueDate)}
              </div>
              {invoice.dueDate && (
                <div className="text-sm tabular-nums">
                  <span className="text-neutral-500 dark:text-neutral-400">{t.due}: </span>
                  <span className={overdue ? "font-medium text-warning-text" : "text-neutral-500 dark:text-neutral-400"}>
                    {dateFmt.format(invoice.dueDate)}
                  </span>
                </div>
              )}
              {invoice.status === "PAID" && invoice.paidAt && (
                <div className="text-sm text-success-text tabular-nums">
                  {t.paidOn.replace("{date}", dateFmt.format(invoice.paidAt))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line items + totals */}
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
              {invoice.lineItems.map((li) => {
                const amount = Number(li.quantity) * Number(li.unitPrice);
                return (
                  <TableRow key={li.id}>
                    <TableCell className="text-neutral-900 dark:text-neutral-100">
                      {li.description}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{Number(li.quantity)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(Number(li.unitPrice))}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(amount)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-2 border-t border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{t.subtotal}</span>
              <span className="tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                {t.tax} ({Number(invoice.taxRate)}%)
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

      {invoice.notes && (
        <Card className="animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.notes}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">
              {invoice.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {locked && <Alert variant="info">{t.lockedNote}</Alert>}

      {/* Manage */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {invoice.createdBy?.name
            ? t.createdBy.replace("{name}", invoice.createdBy.name)
            : formatInvoiceNumber(invoice.number)}
        </h2>
        <ShareInvoiceButton invoiceId={invoice.id} initialToken={invoice.publicToken} />
        <form action={duplicateInvoiceAction.bind(null, invoice.id)}>
          <Button type="submit" variant="outline" className="w-full">
            <Copy className="h-4 w-4" />
            {t.duplicate}
          </Button>
        </form>
        <EmailToCustomerButton
          action={emailInvoiceAction.bind(null, invoice.id)}
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
        <div className="mt-1 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <DeleteInvoiceButton invoiceId={invoice.id} fullWidth />
        </div>
      </section>
    </div>
  );
}
