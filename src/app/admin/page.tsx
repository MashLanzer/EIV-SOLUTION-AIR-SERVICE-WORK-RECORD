import Link from "next/link";
import {
  ClipboardList,
  CalendarDays,
  CalendarRange,
  Users,
  ArrowRight,
  Clock3,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Wrench,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarList } from "@/components/charts/BarList";
import { DashboardGreeting } from "@/components/admin/DashboardGreeting";
import { formatTime } from "@/lib/format";
import { buildPayReport, parsePayReportParams } from "@/lib/payReport";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const WEEKS_BACK = 8;
const TYPE_WINDOW_MONTHS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(base = new Date()) {
  const day = base.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  return new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() - diff
    )
  );
}

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// A trailing window instead of "all time" keeps the type-of-work groupBy
// from scanning the entire table forever as the record count grows.
function monthsAgo(months: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// Coarse "how long has this been waiting" label for the review queue.
function timeAgo(date: Date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const thisWeekMonday = startOfWeek();
  const windowStart = new Date(thisWeekMonday.getTime() - (WEEKS_BACK - 1) * 7 * DAY_MS);
  const payParams = parsePayReportParams({});

  const [
    totalRecords,
    recordsThisWeek,
    recordsThisMonth,
    activeWorkers,
    pendingReview,
    pendingQueue,
    recentRecords,
    weeklyRecords,
    typeGroups,
    payReport,
  ] = await Promise.all([
    prisma.workRecord.count(),
    prisma.workRecord.count({ where: { date: { gte: thisWeekMonday } } }),
    prisma.workRecord.count({ where: { date: { gte: startOfMonth() } } }),
    prisma.user.count({ where: { active: true } }),
    prisma.workRecord.count({ where: { status: "SUBMITTED" } }),
    // The oldest-waiting pending records - the dashboard leads with these as
    // an actionable review queue.
    prisma.workRecord.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        createdAt: true,
        submittedBy: { select: { name: true } },
      },
    }),
    prisma.workRecord.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        date: true,
        arrivalTime: true,
        submittedBy: { select: { name: true } },
      },
    }),
    prisma.workRecord.findMany({
      where: { date: { gte: windowStart } },
      select: { date: true },
    }),
    prisma.workRecord.groupBy({
      by: ["typeOfWork"],
      where: { date: { gte: monthsAgo(TYPE_WINDOW_MONTHS) } },
      _count: { _all: true },
    }),
    buildPayReport(payParams),
  ]);

  const stats = [
    { label: "Total Records", value: totalRecords, icon: ClipboardList },
    { label: "This Week", value: recordsThisWeek, icon: CalendarDays },
    { label: "This Month", value: recordsThisMonth, icon: CalendarRange },
    { label: "Active Workers", value: activeWorkers, icon: Users },
  ];

  // Bucket records into WEEKS_BACK weekly columns ending this week.
  const weekBuckets: { label: string; value: number }[] = Array.from(
    { length: WEEKS_BACK },
    (_, i) => {
      const start = new Date(windowStart.getTime() + i * 7 * DAY_MS);
      return { label: formatDate(start), value: 0 };
    }
  );
  for (const r of weeklyRecords) {
    const idx = Math.floor((r.date.getTime() - windowStart.getTime()) / (7 * DAY_MS));
    if (idx >= 0 && idx < weekBuckets.length) weekBuckets[idx].value += 1;
  }

  const typeData = typeGroups
    .map((g) => ({ label: g.typeOfWork, value: g._count._all }))
    .sort((a, b) => b.value - a.value);

  const payData = payReport.rows
    .slice(0, 6)
    .map((row) => ({ label: row.name, value: Math.round(row.total) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
        <DashboardGreeting name={session.user.name} />
      </div>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "40ms" }}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Needs your attention
          </h2>
          {pendingReview > 0 && (
            <Link
              href="/admin/records?status=SUBMITTED"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Review all ({pendingReview})
            </Link>
          )}
        </div>
        {pendingQueue.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success-text">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">All caught up</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  No records are waiting for review.
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-100 p-4 dark:divide-neutral-800">
              {pendingQueue.map((record) => (
                <Link
                  key={record.id}
                  href={`/admin/records/${record.id}`}
                  className="group -mx-3 flex items-center justify-between gap-3 rounded-lg px-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                      <Clock3 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                        Job #{record.jobNumber} — {record.customerName}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {record.submittedBy?.name ?? "—"} · waiting {timeAgo(record.createdAt)}
                      </div>
                    </div>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 sm:inline-flex">
                    Review
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500 sm:hidden" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                  <stat.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
                    {stat.value}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Recent Activity
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No records yet"
                description="Submitted work records will show up here."
              />
            ) : (
              <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {recentRecords.map((record) => (
                  <Link
                    key={record.id}
                    href={`/admin/records/${record.id}`}
                    className="group -mx-3 flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                        Job #{record.jobNumber} — {record.customerName}
                      </div>
                      <div className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
                        {record.submittedBy?.name ?? "—"} · {formatDate(record.date)} ·{" "}
                        {formatTime(record.arrivalTime)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 dark:text-neutral-500" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Trends
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <TrendingUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <CardTitle>
                Records per week (last {WEEKS_BACK} weeks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                data={weekBuckets}
                emptyLabel="No records in this period"
                labelWidth="4rem"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <DollarSign className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <CardTitle>
                Top approved pay this month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                data={payData}
                formatValue={(v) => money.format(v)}
                emptyLabel="No pay recorded this month"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Wrench className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <CardTitle>
                Work by type (last {TYPE_WINDOW_MONTHS} months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarList data={typeData} emptyLabel="No records yet" />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
