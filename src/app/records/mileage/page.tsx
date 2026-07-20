import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { MileageManager, type MileageRow } from "@/components/mileage/MileageManager";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function WorkerMileagePage() {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [rows, monthAgg, org, currency] = await Promise.all([
    prisma.mileageEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 200,
      select: { id: true, date: true, miles: true, note: true },
    }),
    prisma.mileageEntry.aggregate({
      where: { userId: session.user.id, date: { gte: monthStart } },
      _sum: { miles: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { mileageRate: true },
    }),
    getCurrencySymbol(organizationId),
  ]);

  const t = (await getT()).mileage;

  const entries: MileageRow[] = rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    miles: Number(r.miles),
    note: r.note,
  }));

  const rate = org?.mileageRate != null ? Number(org.mileageRate) : null;
  const monthMiles = Number(monthAgg._sum.miles ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.title} description={t.subtitle} backHref="/records" backLabel={t.back} />

      <div className="grid animate-fade-up grid-cols-2 gap-3">
        <StatTile value={`${monthMiles} ${t.miShort}`} label={t.thisMonth} />
        {rate != null && (
          <StatTile value={formatMoney(monthMiles * rate, currency)} label={t.reimbursement} />
        )}
      </div>

      <MileageManager entries={entries} rate={rate} currency={currency} />
    </div>
  );
}
