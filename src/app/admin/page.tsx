import Link from "next/link";
import {
  ClipboardList,
  CalendarDays,
  CalendarRange,
  Users,
  ArrowRight,
  Clock3,
  TrendingUp,
  DollarSign,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
      <DashboardGreeting name={session.user.name} />

      <Link
        href="/admin/records?status=SUBMITTED"
        aria-label={`${pendingReview} records pending review`}
        className="block"
      >
        <Card className="border-accent/30 bg-accent-soft/40 transition-shadow hover:shadow-md dark:bg-accent-soft/20">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Clock3 className="h-7 w-7" />
            </span>
            <div>
              <div className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
                {pendingReview}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Pending Review</div>
            </div>
            <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500" />
          </CardContent>
        </Card>
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <stat.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {stat.value}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Trends
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <TrendingUp className="h-4 w-4 text-accent" />
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
              <DollarSign className="h-4 w-4 text-accent" />
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
              <Wrench className="h-4 w-4 text-accent" />
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

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Shortcuts
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <CardTitle>All Work Records</CardTitle>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  View and filter every submitted record
                </p>
              </div>
              <Button asChild variant="outline" size="icon">
                <Link href="/admin/records" aria-label="Go to records">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <CardTitle>Manage Workers</CardTitle>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Authorize emails, set roles, deactivate accounts
                </p>
              </div>
              <Button asChild variant="outline" size="icon">
                <Link href="/admin/workers" aria-label="Go to workers">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-3">
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
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                        Job #{record.jobNumber} — {record.customerName}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {record.submittedBy?.name ?? "—"} · {formatDate(record.date)} ·{" "}
                        {formatTime(record.arrivalTime)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
