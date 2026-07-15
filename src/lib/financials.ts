import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/invoices";

const round = (n: number) => Math.round(n * 100) / 100;

// Company financial snapshot: money in (paid + outstanding), tax collected, and
// this month's labor cost + gross profit. Org-scoped; call behind requireAdmin.
export async function getFinancials(organizationId: string) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [invoices, records] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId, status: { in: ["SENT", "PAID"] } },
      select: {
        status: true,
        paidAt: true,
        taxRate: true,
        lineItems: { select: { quantity: true, unitPrice: true } },
      },
    }),
    prisma.workRecord.findMany({
      where: { organizationId, status: "APPROVED", date: { gte: monthStart } },
      select: { leadInstallerPay: true, helperPay: true },
    }),
  ]);

  let paidTotal = 0;
  let paidThisMonth = 0;
  let outstanding = 0;
  let taxTotal = 0;
  let taxThisMonth = 0;

  for (const inv of invoices) {
    const t = computeTotals(
      inv.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
      Number(inv.taxRate)
    );
    if (inv.status === "PAID") {
      paidTotal += t.total;
      taxTotal += t.tax;
      if (inv.paidAt && inv.paidAt >= monthStart) {
        paidThisMonth += t.total;
        taxThisMonth += t.tax;
      }
    } else if (inv.status === "SENT") {
      outstanding += t.total;
    }
  }

  let laborThisMonth = 0;
  for (const r of records) {
    laborThisMonth += Number(r.leadInstallerPay) + Number(r.helperPay ?? 0);
  }

  return {
    paidTotal: round(paidTotal),
    paidThisMonth: round(paidThisMonth),
    outstanding: round(outstanding),
    taxTotal: round(taxTotal),
    taxThisMonth: round(taxThisMonth),
    laborThisMonth: round(laborThisMonth),
    grossProfitThisMonth: round(paidThisMonth - laborThisMonth),
  };
}
