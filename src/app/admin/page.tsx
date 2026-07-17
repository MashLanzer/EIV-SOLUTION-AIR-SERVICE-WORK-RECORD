import Link from "next/link";
import {
  ClipboardList,
  CalendarClock,
  ArrowRight,
  ChevronRight,
  Clock3,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Wrench,
  FolderKanban,
  Image as ImageIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarList } from "@/components/charts/BarList";
import { DashboardGreeting } from "@/components/admin/DashboardGreeting";
import { DashboardQuickActions } from "@/components/admin/DashboardQuickActions";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildPayReport, parsePayReportParams } from "@/lib/payReport";
import { computeTotals } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
import { getAssignablePositions } from "@/lib/positions";
import { getCurrencySymbol } from "@/lib/currency";
import { requireOrgId } from "@/lib/orgScope";
import { requireOfficeAccess } from "@/lib/authz";
import { addUtcDays, startOfUtcDay } from "@/lib/schedule";
import { getLocale, getT } from "@/lib/i18n/server";

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

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// Whole days a record has been waiting - used to escalate the review-queue tone.
function daysWaiting(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

// Coarse "how long has this been waiting" label for the review queue.
function timeAgo(date: Date, justNow: string) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return justNow;
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// Whole-number money with grouping; the org's currency symbol is prefixed by
// the caller (currency is a configurable symbol, not a locale currency code).
const moneyNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// Grouped overview card + its cluster label, plus the metric figures inside.
const GROUP_CARD =
  "group rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700";
const GROUP_LABEL =
  "text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500";

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-2 text-center">
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      <div className="mt-1 text-xs leading-tight text-neutral-500 dark:text-neutral-400">{label}</div>
    </div>
  );
}

function MetricLink({ value, label, href }: { value: number | string; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col items-center px-2 text-center transition-opacity hover:opacity-70"
    >
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      <div className="mt-1 text-xs leading-tight text-neutral-500 dark:text-neutral-400">{label}</div>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const { session } = await requireOfficeAccess();
  const organizationId = requireOrgId(session);
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
    activeProjects,
    photoCount,
    teamCount,
    recentPhotos,
    recentActiveProjects,
    todayJobs,
    todaySchedule,
    currencySymbol,
    returnedCount,
    sentInvoices,
  ] = await Promise.all([
    prisma.workRecord.count({ where: { organizationId } }),
    prisma.workRecord.count({ where: { organizationId, date: { gte: thisWeekMonday } } }),
    prisma.workRecord.count({ where: { organizationId, date: { gte: startOfMonth() } } }),
    prisma.user.count({ where: { organizationId, active: true } }),
    prisma.workRecord.count({ where: { organizationId, status: "SUBMITTED" } }),
    // The oldest-waiting pending records - the dashboard leads with these as
    // an actionable review queue.
    prisma.workRecord.findMany({
      where: { organizationId, status: "SUBMITTED" },
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
      where: { organizationId },
      take: 3,
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
      where: { organizationId, date: { gte: windowStart } },
      select: { date: true },
    }),
    prisma.workRecord.groupBy({
      by: ["typeOfWork"],
      where: { organizationId, date: { gte: monthsAgo(TYPE_WINDOW_MONTHS) } },
      _count: { _all: true },
    }),
    buildPayReport(payParams, organizationId),
    prisma.project.count({ where: { organizationId, status: { not: "COMPLETED" } } }),
    prisma.photo.count({ where: { organizationId } }),
    prisma.team.count({ where: { organizationId } }),
    // A visual strip of the latest jobsite photos.
    prisma.photo.findMany({
      where: { organizationId },
      orderBy: { takenAt: "desc" },
      take: 12,
      select: { id: true, url: true, project: { select: { id: true } } },
    }),
    // The most recently touched active projects, with checklist progress.
    prisma.project.findMany({
      where: { organizationId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { records: true, photos: true } },
        checklists: { select: { items: { select: { done: true } } } },
      },
    }),
    // Jobs planned for today (excluding canceled) - the dashboard's live count
    // linking into the schedule.
    prisma.scheduledJob.count({
      where: {
        organizationId,
        status: { not: "CANCELED" },
        scheduledFor: {
          gte: startOfUtcDay(new Date()),
          lt: addUtcDays(startOfUtcDay(new Date()), 1),
        },
      },
    }),
    // The actual jobs planned for today, timed ones first, so the dashboard can
    // show a glanceable "what's on today" list, not just a count.
    prisma.scheduledJob.findMany({
      where: {
        organizationId,
        status: { not: "CANCELED" },
        scheduledFor: {
          gte: startOfUtcDay(new Date()),
          lt: addUtcDays(startOfUtcDay(new Date()), 1),
        },
      },
      orderBy: [{ startTime: "asc" }, { createdAt: "asc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        assignedTo: { select: { name: true } },
        team: { select: { name: true } },
        customer: { select: { name: true } },
      },
    }),
    getCurrencySymbol(organizationId),
    // Records the reviewer returned that the worker hasn't resubmitted - a
    // pipeline cue so stuck records are visible from the landing page.
    prisma.workRecord.count({ where: { organizationId, status: "NEEDS_CHANGES" } }),
    // Sent-but-unpaid invoices, to surface the outstanding balance as a tile.
    prisma.invoice.findMany({
      where: { organizationId, status: "SENT" },
      select: { taxRate: true, lineItems: { select: { quantity: true, unitPrice: true } } },
    }),
  ]);

  // One unified metrics grid: a headline "Total Records" hero, then the
  // remaining stats + the clickable workspace shortcuts as uniform tiles.
  const dict = await getT();
  const t = dict.dashboard;
  const locale = await getLocale();
  const fmtMoney = (n: number) => `${currencySymbol}${moneyNumber.format(n)}`;
  const isAdmin = session.user.role === "ADMIN";

  // Seed lists for the dashboard quick-action create sheets (Project / Worker /
  // Team). Only fetched for admins, who are the ones shown the quick actions.
  const quickCreateData = isAdmin
    ? await Promise.all([
        prisma.team.findMany({
          where: { organizationId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.customer.findMany({
          where: { organizationId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.user.findMany({
          where: { organizationId },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true, role: true },
        }),
        prisma.project.findMany({
          where: { organizationId, status: { not: "COMPLETED" } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        getAssignablePositions(organizationId),
      ]).then(([teams, customers, users, projects, positions]) => ({
        teams,
        customers,
        users,
        projects,
        positions,
      }))
    : null;

  const outstandingTotal = sentInvoices.reduce(
    (sum, inv) =>
      sum +
      computeTotals(
        inv.lineItems.map((li) => ({
          quantity: Number(li.quantity),
          unitPrice: Number(li.unitPrice),
        })),
        Number(inv.taxRate)
      ).total,
    0
  );

  // Bucket records into WEEKS_BACK weekly columns ending this week.
  const weekBuckets: { label: string; value: number }[] = Array.from(
    { length: WEEKS_BACK },
    (_, i) => {
      const start = new Date(windowStart.getTime() + i * 7 * DAY_MS);
      return { label: formatDate(start, locale), value: 0 };
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
      <SegmentedNav
        ariaLabel={dict.nav.dashboard}
        items={[
          { label: dict.nav.dashboard, href: "/admin", active: true },
          { label: dict.nav.records, href: "/admin/records", active: false },
        ]}
      />
      <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
        <DashboardGreeting
          name={session.user.name}
          pendingReview={pendingReview}
          todayJobs={todayJobs}
        />
      </div>

      {quickCreateData && <DashboardQuickActions data={quickCreateData} />}

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.overview}
        </h2>
        {/* A few grouped cards instead of one tile per metric: money, records
            and company clusters, so the screen holds all the numbers in three
            boxes instead of ten. */}
        <div className="flex flex-col gap-3">
          {isAdmin && (
            <Link href="/admin/reports" className={GROUP_CARD}>
              <div className="mb-3 flex items-center justify-between">
                <span className={GROUP_LABEL}>{t.groupMoney}</span>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 dark:text-neutral-500" />
              </div>
              <div className="grid grid-cols-2 divide-x divide-neutral-100 dark:divide-neutral-800">
                <Metric value={fmtMoney(payReport.grand.total)} label={t.toPayThisMonth} />
                <Metric value={fmtMoney(outstandingTotal)} label={t.tileOutstanding} />
              </div>
            </Link>
          )}

          <Link href="/admin/records" className={GROUP_CARD}>
            <div className="mb-3 flex items-center justify-between">
              <span className={GROUP_LABEL}>{t.groupRecords}</span>
              <ArrowRight className="h-3.5 w-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5 dark:text-neutral-500" />
            </div>
            <div className="grid grid-cols-3 divide-x divide-neutral-100 dark:divide-neutral-800">
              <Metric value={recordsThisWeek} label={t.tileThisWeek} />
              <Metric value={recordsThisMonth} label={t.tileThisMonth} />
              <Metric value={totalRecords} label={t.shortTotal} />
            </div>
          </Link>

          <div className={cn(GROUP_CARD, "cursor-default")}>
            <div className="mb-3">
              <span className={GROUP_LABEL}>{t.groupCompany}</span>
            </div>
            <div className="grid grid-cols-4 divide-x divide-neutral-100 dark:divide-neutral-800">
              <MetricLink value={activeWorkers} label={t.shortWorkers} href="/admin/workers" />
              <MetricLink value={activeProjects} label={t.shortProjects} href="/admin/projects" />
              <MetricLink value={photoCount} label={t.tilePhotos} href="/admin/photos" />
              <MetricLink value={teamCount} label={t.tileTeams} href="/admin/teams" />
            </div>
          </div>
        </div>
      </section>

      {todaySchedule.length > 0 && (
        <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.todaySchedule}
            </h2>
            <Link
              href="/admin/schedule"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.viewAll}
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {todaySchedule.map((job) => {
                const who = job.assignedTo?.name ?? job.team?.name ?? t.unassigned;
                const when = job.startTime
                  ? `${formatTime(job.startTime)}${job.endTime ? `–${formatTime(job.endTime)}` : ""}`
                  : t.allDay;
                return (
                  <Link
                    key={job.id}
                    href="/admin/schedule"
                    className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors first:pt-0 last:pb-0 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span className="flex w-16 shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                      {when}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                        {job.title}
                      </div>
                      <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                        {who}
                        {job.customer?.name ? ` · ${job.customer.name}` : ""}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  </Link>
                );
              })}
          </div>
        </section>
      )}

      {recentActiveProjects.length > 0 && (
        <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.activeProjects}
            </h2>
            <Link
              href="/admin/projects"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.viewAll}
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentActiveProjects.map((p) => {
              let total = 0;
              let done = 0;
              for (const c of p.checklists)
                for (const item of c.items) {
                  total++;
                  if (item.done) done++;
                }
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <Card
                  key={p.id}
                  className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="flex items-center gap-3 rounded-xl p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      <FolderKanban className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                          {p.name}
                        </span>
                        <ProjectStatusBadge status={p.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                        {total > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                              <span
                                className="block h-full rounded-full bg-neutral-800 dark:bg-neutral-200"
                                style={{ width: `${pct}%` }}
                              />
                            </span>
                            <span className="tabular-nums">{pct}%</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span className="tabular-nums">{p._count.photos}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardList className="h-3.5 w-3.5" />
                          <span className="tabular-nums">{p._count.records}</span>
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  </Link>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "40ms" }}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.needsAttention}
          </h2>
          {pendingReview > 0 && (
            <Link
              href="/admin/records?status=SUBMITTED"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.reviewAll.replace("{n}", String(pendingReview))}
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
                <div className="font-medium text-neutral-900 dark:text-neutral-100">{t.allCaughtUp}</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">{t.nothingWaiting}</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-100 p-4 dark:divide-neutral-800">
              {pendingQueue.map((record) => {
                // 3+ days waiting reads as urgent (amber icon), matching the
                // review queue's own aging cue.
                const stale = daysWaiting(record.createdAt) >= 3;
                return (
                <Link
                  key={record.id}
                  href={`/admin/records/${record.id}`}
                  className="group -mx-3 flex items-center justify-between gap-3 rounded-lg px-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        stale
                          ? "bg-warning-soft text-warning-text"
                          : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      )}
                    >
                      <Clock3 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                        {dict.records.jobNumber}{record.jobNumber} — {record.customerName}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {record.submittedBy?.name ?? "—"} · {t.waiting.replace("{ago}", timeAgo(record.createdAt, t.justNow))}
                      </div>
                    </div>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 sm:inline-flex">
                    {t.review}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500 sm:hidden" />
                </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
        {returnedCount > 0 && (
          <Link
            href="/admin/review"
            className="group flex items-center justify-between gap-2 rounded-lg px-1 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <span>
              {(returnedCount === 1 ? t.returnedStuckOne : t.returnedStuckMany).replace(
                "{n}",
                String(returnedCount)
              )}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </section>

      {recentPhotos.length > 0 && (
        <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "110ms" }}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.recentPhotos}
            </h2>
            <Link
              href="/admin/photos"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.viewAll}
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recentPhotos.map((photo) => (
              <Link
                key={photo.id}
                href={`/admin/projects/${photo.project.id}/photos/${photo.id}`}
                className="shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={t.recentPhotoAlt}
                  className="h-24 w-24 rounded-lg border border-neutral-200 object-cover transition-opacity hover:opacity-90 dark:border-neutral-800"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.recentRecords}
        </h2>
        {recentRecords.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t.noRecordsYet}
            description={t.noRecordsYetDesc}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-100 p-4 dark:divide-neutral-800">
            {recentRecords.map((record) => (
                  <Link
                    key={record.id}
                    href={`/admin/records/${record.id}`}
                    className="group -mx-3 flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                        {dict.records.jobNumber}{record.jobNumber} — {record.customerName}
                      </div>
                      <div className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
                        {record.submittedBy?.name ?? "—"} · {formatDate(record.date, locale)} ·{" "}
                        {formatTime(record.arrivalTime)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 dark:text-neutral-500" />
                  </Link>
                ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.trends}
        </h2>
        {/* All the charts live behind one disclosure, so trends add no height
            to the dashboard until opened. */}
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
            {t.moreCharts}
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <Card>
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <TrendingUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                <CardTitle>{t.recordsPerWeek.replace("{n}", String(WEEKS_BACK))}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarList data={weekBuckets} emptyLabel={t.noRecordsPeriod} labelWidth="4rem" />
              </CardContent>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <DollarSign className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  <CardTitle>{t.topPay}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarList data={payData} formatValue={fmtMoney} emptyLabel={t.noPayMonth} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-center gap-2 space-y-0">
                  <Wrench className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  <CardTitle>{t.workByType.replace("{n}", String(TYPE_WINDOW_MONTHS))}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarList data={typeData} emptyLabel={t.noRecordsYet} />
                </CardContent>
              </Card>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
