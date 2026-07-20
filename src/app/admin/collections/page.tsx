import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { CollectionsManager, type CollectionRow } from "@/components/collections/CollectionsManager";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { computeTotals, formatInvoiceNumber } from "@/lib/invoices";
import { collectionBucket, daysOverdue, isBucketOverdue } from "@/lib/collections";
import { requireOrgId } from "@/lib/orgScope";
import { requireFeature } from "@/lib/features";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "invoicing");

  // Every unpaid (SENT) invoice with a due date is a collections candidate; the
  // bucketing then drops any that aren't overdue or due within the week.
  const sent = await prisma.invoice.findMany({
    where: { organizationId, status: "SENT", dueDate: { not: null } },
    select: {
      id: true,
      number: true,
      customerName: true,
      dueDate: true,
      taxRate: true,
      customer: { select: { email: true } },
      lineItems: { select: { quantity: true, unitPrice: true } },
    },
  });

  const now = new Date();
  const rows: CollectionRow[] = [];
  for (const inv of sent) {
    const days = daysOverdue(inv.dueDate, now);
    const bucket = collectionBucket(days);
    if (!bucket) continue;
    const { total } = computeTotals(
      inv.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
      Number(inv.taxRate)
    );
    if (total <= 0) continue;
    rows.push({
      id: inv.id,
      number: formatInvoiceNumber(inv.number),
      customerName: inv.customerName,
      hasEmail: Boolean(inv.customer?.email?.trim()),
      total,
      days,
      bucket,
    });
  }
  // Most overdue first (largest days), so the worklist reads top-down.
  rows.sort((a, b) => b.days - a.days);

  const overdueRows = rows.filter((r) => isBucketOverdue(r.bucket));
  const overdueTotal = overdueRows.reduce((s, r) => s + r.total, 0);
  const dueSoonRows = rows.filter((r) => !isBucketOverdue(r.bucket));
  const dueSoonTotal = dueSoonRows.reduce((s, r) => s + r.total, 0);

  const [currency, t] = await Promise.all([
    getCurrencySymbol(organizationId),
    getT().then((d) => d.collections),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="money" />
      <PageHeader title={t.title} description={t.subtitle} />

      <div className="grid animate-fade-up grid-cols-2 gap-3">
        <StatTile
          value={formatMoney(overdueTotal, currency)}
          label={t.overdueLabel.replace("{n}", String(overdueRows.length))}
        />
        <StatTile
          value={formatMoney(dueSoonTotal, currency)}
          label={t.dueSoonLabel.replace("{n}", String(dueSoonRows.length))}
        />
      </div>

      <CollectionsManager rows={rows} currency={currency} />
    </div>
  );
}
