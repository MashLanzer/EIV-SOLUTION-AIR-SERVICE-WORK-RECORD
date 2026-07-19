import Link from "next/link";
import {
  ClipboardList,
  CalendarClock,
  ArrowRight,
  ChevronRight,
  Clock3,
  CheckCircle2,
  FolderKanban,
  Image as ImageIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard, Metric, MetricLink } from "@/components/ui/metric-card";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { DashboardGreeting } from "@/components/admin/DashboardGreeting";
import { DashboardQuickActions } from "@/components/admin/DashboardQuickActions";
import { DashboardTrends } from "@/components/admin/DashboardTrends";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { defaultPayReportRange } from "@/lib/payReport";
import { computeTotals } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";
import { getAssignablePositions } from "@/lib/positions";
import { getCurrencySymbol } from "@/lib/currency";
import { getUse24Hour } from "@/lib/timeFormat";
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

export default async function AdminDashboardPage() {
  const { session } = await requireOfficeAccess();
  const organizationId = requireOrgId(session);
  const thisWeekMonday = startOfWeek();
  const isAdmin = session.user.role === "ADMIN";
  // Pay owed this month feeds a headline tile; the full per-worker report is
  // deferred to the (collapsed) trends section, so only the total is fetched.
  const payRange = defaultPayReportRange();
  // Previous-period bounds, for the trend deltas on the headline metrics.
  const thisMonthStart = startOfMonth();
  const prevMonthStart = new Date(
    Date.UTC(thisMonthStart.getUTCFullYear(), thisMonthStart.getUTCMonth() - 1, 1)
  );
  const prevWeekMonday = new Date(thisWeekMonday);
  prevWeekMonday.setUTCDate(prevWeekMonday.getUTCDate() - 7);

  // A single parallel batch: every figure the first paint needs, plus the
  // create-sheet seeds (admins only) and i18n - no second sequential round-trip.
  const [
    totalRecords,
    recordsThisWeek,
    recordsThisMonth,
    activeWorkers,
    pendingReview,
    pendingQueue,
    recentRecords,
    payThisMonth,
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
    use24,
    dict,
    locale,
    quickCreateData,
    prevWeekRecords,
    prevMonthRecords,
    prevMonthPay,
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
    // Just the sum owed this month (approved records) for the money tile - a
    // cheap aggregate instead of the full grouped pay report.
    prisma.workRecord.aggregate({
      where: {
        organizationId,
        status: "APPROVED",
        date: { gte: new Date(payRange.dateFrom), lte: new Date(payRange.dateTo) },
      },
      _sum: { leadInstallerPay: true, helperPay: true },
    }),
    prisma.project.count({ where: { organizationId, status: { not: "COMPLETED" } } }),
    prisma.photo.count({ where: { organizationId } }),
    prisma.team.count({ where: { organizationId } }),
    // A visual strip of the latest jobsite photos.
    prisma.photo.findMany({
      where: { organizationId },
      orderBy: { takenAt: "desc" },
      take: 12,
      select: { id: true, url: true, project: { select: { id: true, name: true } } },
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
    getUse24Hour(organizationId),
    getT(),
    getLocale(),
    // Seed lists for the quick-action create sheets. Only admins see them, so
    // non-admins skip the queries entirely.
    isAdmin
      ? Promise.all([
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
      : Promise.resolve(null),
    // Previous-period figures, for the headline-metric trend deltas.
    prisma.workRecord.count({
      where: { organizationId, date: { gte: prevWeekMonday, lt: thisWeekMonday } },
    }),
    prisma.workRecord.count({
      where: { organizationId, date: { gte: prevMonthStart, lt: thisMonthStart } },
    }),
    prisma.workRecord.aggregate({
      where: {
        organizationId,
        status: "APPROVED",
        date: { gte: prevMonthStart, lt: thisMonthStart },
      },
      _sum: { leadInstallerPay: true, helperPay: true },
    }),
  ]);

  const t = dict.dashboard;
  const fmtMoney = (n: number) => `${currencySymbol}${moneyNumber.format(n)}`;

  const payThisMonthTotal =
    Number(payThisMonth._sum.leadInstallerPay ?? 0) + Number(payThisMonth._sum.helperPay ?? 0);
  const prevMonthPayTotal =
    Number(prevMonthPay._sum.leadInstallerPay ?? 0) + Number(prevMonthPay._sum.helperPay ?? 0);

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

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="overview" />
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
            <MetricCard label={t.groupMoney} href="/admin/reports" cols="grid-cols-2">
              <Metric
                value={fmtMoney(payThisMonthTotal)}
                label={t.toPayThisMonth}
                delta={
                  <DeltaBadge
                    current={payThisMonthTotal}
                    previous={prevMonthPayTotal}
                    format={fmtMoney}
                  />
                }
              />
              <Metric value={fmtMoney(outstandingTotal)} label={t.tileOutstanding} />
            </MetricCard>
          )}

          <MetricCard label={t.groupRecords} href="/admin/records" cols="grid-cols-3">
            <Metric
              value={recordsThisWeek}
              label={t.tileThisWeek}
              delta={<DeltaBadge current={recordsThisWeek} previous={prevWeekRecords} />}
            />
            <Metric
              value={recordsThisMonth}
              label={t.tileThisMonth}
              delta={<DeltaBadge current={recordsThisMonth} previous={prevMonthRecords} />}
            />
            <Metric value={totalRecords} label={t.shortTotal} />
          </MetricCard>

          <MetricCard label={t.groupCompany} cols="grid-cols-4">
            <MetricLink value={activeWorkers} label={t.shortWorkers} href="/admin/workers" />
            <MetricLink value={activeProjects} label={t.shortProjects} href="/admin/projects" />
            <MetricLink value={photoCount} label={t.tilePhotos} href="/admin/photos" />
            <MetricLink value={teamCount} label={t.tileTeams} href="/admin/teams" />
          </MetricCard>
        </div>
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "70ms" }}>
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
                  <ArrowRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 sm:hidden" />
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
          <Card>
            <CardContent className="flex flex-col divide-y divide-neutral-100 p-4 dark:divide-neutral-800">
              {todaySchedule.map((job) => {
                const who = job.assignedTo?.name ?? job.team?.name ?? t.unassigned;
                const when = job.startTime
                  ? `${formatTime(job.startTime, use24)}${job.endTime ? `–${formatTime(job.endTime, use24)}` : ""}`
                  : t.allDay;
                return (
                  <Link
                    key={job.id}
                    href="/admin/schedule"
                    className="group -mx-3 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors first:pt-0 last:pb-0 hover:bg-neutral-50 dark:hover:bg-neutral-800"
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
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
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
                    className="flex items-center gap-3 rounded-xl p-4 transition-colors hover:bg-neutral-50 active:bg-neutral-100 dark:hover:bg-neutral-800 dark:active:bg-neutral-800/60"
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
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  </Link>
                </Card>
              );
            })}
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
                        {formatTime(record.arrivalTime, use24)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-hover:translate-x-0.5 dark:text-neutral-400" />
                  </Link>
                ))}
            </CardContent>
          </Card>
        )}
      </section>

      {recentPhotos.length > 0 && (
        <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "140ms" }}>
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
                  alt={t.recentPhotoAltNamed.replace("{project}", photo.project.name)}
                  width={96}
                  height={96}
                  loading="lazy"
                  decoding="async"
                  className="h-24 w-24 rounded-lg border border-neutral-200 object-cover transition-opacity hover:opacity-90 dark:border-neutral-800"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      <DashboardTrends
        currency={currencySymbol}
        weeksBack={WEEKS_BACK}
        typeMonths={TYPE_WINDOW_MONTHS}
      />
    </div>
  );
}
