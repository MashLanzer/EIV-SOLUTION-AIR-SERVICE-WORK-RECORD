import { EstimateForm } from "@/components/estimates/EstimateForm";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export default async function NewEstimatePage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const [customers, org, currency] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { defaultTaxRate: true },
    }),
    getCurrencySymbol(organizationId),
  ]);

  const t = (await getT()).estimates;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader backHref="/admin/estimates" backLabel={t.backToEstimates} title={t.newEstimate} />
      <EstimateForm
        customers={customers}
        currency={currency}
        defaultValues={{
          customerId: "",
          customerName: "",
          customerAddress: "",
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate: "",
          taxRate: org?.defaultTaxRate != null ? String(Number(org.defaultTaxRate)) : "0",
          notes: "",
          items: [],
        }}
      />
    </div>
  );
}
