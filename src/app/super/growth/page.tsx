import { Building2, DollarSign, PauseCircle, TrendingDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { BarList } from "@/components/charts/BarList";
import { MiniBarChart } from "@/components/super/MiniBarChart";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getPlatformGrowth, getPlatformRevenue, getTopRevenueCompanies } from "@/lib/platform";
import { PLANS, planLabel } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Compact money for chart labels: $1.2k, $980.
function shortMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

export default async function SuperGrowthPage() {
  await requireSuperAdmin();
  const [{ points, activeOrgs, suspendedOrgs }, revenue, topRevenue] = await Promise.all([
    getPlatformGrowth(6),
    getPlatformRevenue(),
    getTopRevenueCompanies(8),
  ]);
  const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

  const totalOrgs = activeOrgs + suspendedOrgs;
  const suspendedRate = totalOrgs > 0 ? Math.round((suspendedOrgs / totalOrgs) * 100) : 0;
  const mrr = `$${Math.round(revenue.mrr).toLocaleString("en-US")}`;

  // How the estimated MRR splits across paid plans (count × catalog price).
  const mrrByPlan = revenue.distribution
    .filter((d) => d.plan && PLANS[d.plan].priceMonthly > 0)
    .map((d) => {
      const price = PLANS[d.plan!].priceMonthly;
      return { plan: d.plan!, count: d.count, price, subtotal: d.count * price };
    })
    .sort((a, b) => b.subtotal - a.subtotal);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Insights</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Revenue, plans and growth trends over the last 6 months.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={DollarSign} value={`${mrr}/mo`} label="Est. MRR" tone="success" />
        <StatTile icon={Building2} value={String(activeOrgs)} label="Active companies" />
        <StatTile icon={PauseCircle} value={String(suspendedOrgs)} label="Suspended" />
        <StatTile
          icon={TrendingDown}
          value={`${suspendedRate}%`}
          label="Suspended rate"
          tone={suspendedRate > 0 ? "warning" : "default"}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Companies by plan
        </h2>
        <Card>
          <CardContent className="p-4">
            <BarList
              data={revenue.distribution.map((d) => ({ label: planLabel(d.plan), value: d.count }))}
              formatValue={(v) => String(v)}
              emptyLabel="No active companies yet"
              labelWidth="5rem"
            />
          </CardContent>
        </Card>
        <p className="px-1 text-xs text-neutral-400 dark:text-neutral-500">
          Est. MRR uses the plan catalog price across active companies.
        </p>
      </section>

      {mrrByPlan.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            MRR by plan
          </h2>
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
              {mrrByPlan.map((r) => (
                <div key={r.plan} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {planLabel(r.plan)}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {r.count} {r.count === 1 ? "company" : "companies"} × ${r.price}/mo
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {money(r.subtotal)}/mo
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 bg-neutral-50 px-4 py-3 dark:bg-neutral-900/50">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Total</span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-success-text">{mrr}/mo</span>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Top companies by paid revenue
        </h2>
        <Card>
          <CardContent className="p-4">
            <BarList
              data={topRevenue.map((c) => ({
                label: c.name,
                value: c.revenue,
                href: `/super/orgs/${c.id}`,
              }))}
              formatValue={money}
              emptyLabel="No paid invoices yet"
              labelWidth="8rem"
            />
          </CardContent>
        </Card>
        <p className="px-1 text-xs text-neutral-400 dark:text-neutral-500">
          All-time revenue from paid invoices, across every company.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <MiniBarChart
          title="New companies / month"
          bars={points.map((p) => ({ label: p.label, value: p.orgs, display: String(p.orgs) }))}
        />
        <MiniBarChart
          title="New work records / month"
          bars={points.map((p) => ({ label: p.label, value: p.records, display: String(p.records) }))}
        />
        <MiniBarChart
          title="Paid revenue / month"
          bars={points.map((p) => ({ label: p.label, value: p.revenue, display: shortMoney(p.revenue) }))}
        />
      </div>
    </div>
  );
}
