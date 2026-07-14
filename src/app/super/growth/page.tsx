import { Building2, PauseCircle, TrendingDown } from "lucide-react";

import { StatTile } from "@/components/ui/stat-tile";
import { MiniBarChart } from "@/components/super/MiniBarChart";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getPlatformGrowth } from "@/lib/platform";

export const dynamic = "force-dynamic";

// Compact money for chart labels: $1.2k, $980.
function shortMoney(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

export default async function SuperGrowthPage() {
  await requireSuperAdmin();
  const { points, activeOrgs, suspendedOrgs } = await getPlatformGrowth(6);

  const totalOrgs = activeOrgs + suspendedOrgs;
  const suspendedRate = totalOrgs > 0 ? Math.round((suspendedOrgs / totalOrgs) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Growth</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Platform trends over the last 6 months.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={Building2} value={String(activeOrgs)} label="Active companies" />
        <StatTile icon={PauseCircle} value={String(suspendedOrgs)} label="Suspended" />
        <StatTile
          icon={TrendingDown}
          value={`${suspendedRate}%`}
          label="Suspended rate"
          tone={suspendedRate > 0 ? "warning" : "default"}
        />
      </div>

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
