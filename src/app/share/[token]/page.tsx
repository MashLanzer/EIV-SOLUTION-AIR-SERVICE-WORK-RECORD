import { notFound } from "next/navigation";

import { StatTile } from "@/components/ui/stat-tile";
import { FinancialDigest } from "@/components/financials/FinancialDigest";
import { ForecastChart } from "@/components/financials/ForecastChart";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { getFinancials } from "@/lib/financials";
import { buildDigest, DIGEST_MONEY_TOKENS, type DigestLine } from "@/lib/digest";
import { forecastRevenue } from "@/lib/forecast";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function resolveLine(
  line: DigestLine,
  templates: Record<string, string>,
  money: (n: number) => string
): string {
  let s = templates[line.key] ?? "";
  for (const [k, v] of Object.entries(line.values)) {
    s = s.replaceAll(`{${k}}`, DIGEST_MONEY_TOKENS.has(k) ? money(Number(v)) : String(v));
  }
  return s;
}

// A public, read-only financial snapshot reachable only via the org's
// unguessable reportToken. No auth — the point is that an owner can share it
// (with an accountant, a partner) without granting an account.
export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const org = await prisma.organization.findFirst({
    where: { reportToken: token },
    select: { id: true, name: true, logoUrl: true },
  });
  if (!org) notFound();

  const [fin, currency, dict, locale] = await Promise.all([
    getFinancials(org.id, "month"),
    getCurrencySymbol(org.id),
    getT(),
    getLocale(),
  ]);
  const t = dict.reportShare;
  const moneyShort = (n: number) =>
    `${currency}${Math.round(n).toLocaleString(locale === "es" ? "es-ES" : "en-US")}`;
  const monthFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const digestLines = buildDigest({
    revenue: fin.revenue,
    prevRevenue: fin.previous.revenue,
    labor: fin.labor,
    grossProfit: fin.grossProfit,
    margin: Math.round(fin.margin),
    outstanding: fin.outstanding,
    overdueAmount: fin.collections.overdue.amount,
    overdueCount: fin.collections.overdue.count,
    jobCount: fin.jobCount,
    topCustomer: fin.topCustomers[0] ?? null,
    goalPct: fin.goal.pct,
  }).map((line) => ({ tone: line.tone, text: resolveLine(line, dict.digest, moneyShort) }));

  const history = fin.trend.map((p) => p.value);
  const fc = forecastRevenue(history, 3);
  const showForecast = history.some((v) => v > 0);
  const lastTrend = fin.trend[fin.trend.length - 1];
  const forecastMonthLabels = [
    ...fin.trend.map((p) => monthFmt.format(new Date(Date.UTC(p.year, p.month, 1)))),
    ...fc.points.map((p) =>
      monthFmt.format(new Date(Date.UTC(lastTrend.year, lastTrend.month + p.step, 1)))
    ),
  ];
  const tf = dict.forecast;

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 dark:bg-neutral-950">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <header className="flex flex-col items-center gap-2 text-center">
          {org.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt=""
              className="h-12 w-12 rounded-xl border border-neutral-200 object-contain dark:border-neutral-800"
            />
          )}
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{org.name}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t.heading} · {monthFmt.format(new Date())}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <StatTile value={moneyShort(fin.revenue)} label={t.revenue} />
          <StatTile value={moneyShort(fin.grossProfit)} label={t.grossProfit} />
          <StatTile value={moneyShort(fin.outstanding)} label={t.outstanding} />
          <StatTile value={String(fin.jobCount)} label={t.jobs} />
        </div>

        <FinancialDigest heading={dict.digest.heading} lines={digestLines} />

        {showForecast && (
          <ForecastChart
            heading={tf.heading}
            history={history}
            points={fc.points}
            monthLabels={forecastMonthLabels}
            nextLabel={tf.nextMonth}
            nextValue={moneyShort(fc.points[0].value)}
            rangeLabel={tf.range
              .replace("{low}", moneyShort(fc.points[0].low))
              .replace("{high}", moneyShort(fc.points[0].high))}
            confidenceLabel={tf.confidence.replace("{n}", String(fc.confidencePct))}
            slope={fc.slope}
          />
        )}

        <p className="pt-2 text-center text-xs text-neutral-400 dark:text-neutral-600">{t.footer}</p>
      </div>
    </main>
  );
}
