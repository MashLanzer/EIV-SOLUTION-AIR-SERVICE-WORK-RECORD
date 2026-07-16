import { Banknote, HandCoins, Landmark, PiggyBank, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { getCurrencySymbol } from "@/lib/currency";
import { getFinancials } from "@/lib/financials";
import { requireFeature } from "@/lib/features";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function FinancialsPage() {
  const session = await requirePermission("financials.view");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "invoicing");

  const [fin, currency, dict] = await Promise.all([
    getFinancials(organizationId),
    getCurrencySymbol(organizationId),
    getT(),
  ]);
  const t = dict.financials;
  const money = (n: number) => `${currency}${n.toFixed(2)}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.title} />

      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.thisMonth}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={Wallet} value={money(fin.paidThisMonth)} label={t.revenue} tone="success" />
        <StatTile icon={HandCoins} value={money(fin.laborThisMonth)} label={t.labor} />
        <StatTile
          icon={TrendingUp}
          value={money(fin.grossProfitThisMonth)}
          label={t.grossProfit}
          tone={fin.grossProfitThisMonth >= 0 ? "success" : "warning"}
        />
        <StatTile icon={Landmark} value={money(fin.taxThisMonth)} label={t.tax} />
      </div>

      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{t.allTime}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={Banknote} value={money(fin.paidTotal)} label={t.collected} />
        <StatTile
          icon={PiggyBank}
          value={money(fin.outstanding)}
          label={t.outstanding}
          tone={fin.outstanding > 0 ? "warning" : "default"}
        />
        <StatTile icon={Landmark} value={money(fin.taxTotal)} label={t.taxCollected} />
      </div>

      <p className="text-xs text-neutral-400">{t.note}</p>
    </div>
  );
}
