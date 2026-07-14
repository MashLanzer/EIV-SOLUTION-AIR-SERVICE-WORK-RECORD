import { notFound, redirect } from "next/navigation";

import { EstimateForm } from "@/components/estimates/EstimateForm";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { formatEstimateNumber } from "@/lib/estimates";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, organizationId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
  if (!estimate) notFound();
  if (estimate.convertedInvoiceId) redirect(`/admin/estimates/${id}`);

  const [customers, currency] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
    getCurrencySymbol(organizationId),
  ]);

  const t = (await getT()).estimates;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backHref={`/admin/estimates/${id}`}
        backLabel={formatEstimateNumber(estimate.number)}
        title={t.editEstimate}
      />
      <EstimateForm
        estimateId={estimate.id}
        customers={customers}
        currency={currency}
        defaultValues={{
          customerId: estimate.customerId ?? "",
          customerName: estimate.customerName,
          customerAddress: estimate.customerAddress ?? "",
          issueDate: isoDate(estimate.issueDate),
          dueDate: isoDate(estimate.expiryDate),
          taxRate: String(Number(estimate.taxRate)),
          notes: estimate.notes ?? "",
          items: estimate.lineItems.map((li) => ({
            description: li.description,
            quantity: String(Number(li.quantity)),
            unitPrice: String(Number(li.unitPrice)),
          })),
        }}
      />
    </div>
  );
}
