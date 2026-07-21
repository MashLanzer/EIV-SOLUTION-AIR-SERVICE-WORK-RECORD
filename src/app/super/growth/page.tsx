import { Building2, DollarSign, PauseCircle, TrendingDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { BarList } from "@/components/charts/BarList";
import { MiniBarChart } from "@/components/super/MiniBarChart";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getPlatformGrowth, getPlatformRevenue } from "@/lib/platform";
import { planLabel } from "@/lib/plans";

export const dynamic = "force-dynamic";

// Compact money for chart labels: $1.2k, $980.
function shortMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

export default async function SuperGrowthPage() {
  await requireSuperAdmin();
  const [{ points, activeOrgs, suspendedOrgs }, revenue] = await Promise.all([
    getPlatformGrowth(6),
    getPlatformRevenue(),
  ]);

  const totalOrgs = activeOrgs + suspendedOrgs;
  const suspendedRate = totalOrgs > 0 ? Math.round((suspendedOrgs / totalOrgs) * 100) : 0;
  const mrr = `$${Math.round(revenue.mrr).toLocaleString("en-US")}`;

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
