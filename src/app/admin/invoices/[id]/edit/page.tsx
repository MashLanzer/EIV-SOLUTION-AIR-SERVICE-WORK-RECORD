import { notFound, redirect } from "next/navigation";

import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { formatInvoiceNumber } from "@/lib/invoices";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

function isoDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
  if (!invoice) notFound();
  // Paid/void invoices are read-only; reopen from the detail page to edit.
  if (invoice.status === "PAID" || invoice.status === "VOID") {
    redirect(`/admin/invoices/${id}`);
  }

  const [customers, currency] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
    getCurrencySymbol(organizationId),
  ]);

  const t = (await getT()).invoices;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backHref={`/admin/invoices/${id}`}
        backLabel={formatInvoiceNumber(invoice.number)}
        title={t.editInvoice}
      />
      <InvoiceForm
        invoiceId={invoice.id}
        customers={customers}
        currency={currency}
        defaultValues={{
          customerId: invoice.customerId ?? "",
          customerName: invoice.customerName,
          customerAddress: invoice.customerAddress ?? "",
          issueDate: isoDate(invoice.issueDate),
          dueDate: isoDate(invoice.dueDate),
          taxRate: String(Number(invoice.taxRate)),
          notes: invoice.notes ?? "",
          items: invoice.lineItems.map((li) => ({
            description: li.description,
            quantity: String(Number(li.quantity)),
            unitPrice: String(Number(li.unitPrice)),
          })),
        }}
      />
    </div>
  );
}
