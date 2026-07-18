"use client";

import { useState } from "react";
import { ChevronRight, DollarSign, TrendingUp, Wrench } from "lucide-react";

import { BarList } from "@/components/charts/BarList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/components/i18n/LocaleProvider";
import { getDashboardTrends, type DashboardTrendsData } from "@/actions/dashboardTrends";

const moneyNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// A collapsed disclosure of the dashboard's charts. The (heavy) data is not
// loaded with the page — it's fetched the first time the section is opened, so
// the initial dashboard render stays light.
export function DashboardTrends({
  currency,
  weeksBack,
  typeMonths,
}: {
  currency: string;
  weeksBack: number;
  typeMonths: number;
}) {
  const t = useT().dashboard;
  const [data, setData] = useState<DashboardTrendsData | null>(null);
  const [loading, setLoading] = useState(false);
  const fmtMoney = (n: number) => `${currency}${moneyNumber.format(n)}`;

  async function load() {
    if (data || loading) return;
    setLoading(true);
    try {
      setData(await getDashboardTrends());
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {t.trends}
      </h2>
      <details
        className="group"
        onToggle={(e) => {
          if ((e.currentTarget as HTMLDetailsElement).open) void load();
        }}
      >
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
          {t.moreCharts}
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          {!data ? (
            <TrendsSkeleton />
          ) : (
            <>
              <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <TrendingUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  <CardTitle>{t.recordsPerWeek.replace("{n}", String(weeksBack))}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarList data={data.weekBuckets} emptyLabel={t.noRecordsPeriod} labelWidth="4rem" />
                </CardContent>
              </Card>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <DollarSign className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    <CardTitle>{t.topPay}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarList data={data.payData} formatValue={fmtMoney} emptyLabel={t.noPayMonth} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex-row items-center gap-2 space-y-0">
                    <Wrench className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                    <CardTitle>{t.workByType.replace("{n}", String(typeMonths))}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarList data={data.typeData} emptyLabel={t.noRecordsYet} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </details>
    </section>
  );
}

// A lightweight placeholder shown while the charts load.
function TrendsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="h-40 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100/60 dark:border-neutral-800 dark:bg-neutral-800/40" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100/60 dark:border-neutral-800 dark:bg-neutral-800/40" />
        <div className="h-40 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100/60 dark:border-neutral-800 dark:bg-neutral-800/40" />
      </div>
    </div>
  );
}
