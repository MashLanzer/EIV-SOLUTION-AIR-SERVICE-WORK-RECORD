import Link from "next/link";
import {
  ClipboardList,
  CalendarDays,
  CalendarClock,
  CalendarRange,
  Users,
  Users2,
  ArrowRight,
  ChevronRight,
  Clock3,
  FolderPlus,
  UserPlus,
  CalendarPlus,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Wrench,
  FolderKanban,
  Image as ImageIcon,
  Images,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarList } from "@/components/charts/BarList";
import { DashboardGreeting } from "@/components/admin/DashboardGreeting";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { buildPayReport, parsePayReportParams } from "@/lib/payReport";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { requireOrgId } from "@/lib/orgScope";
import { requireReviewer } from "@/lib/session";
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

// Uniform metric tile: small icon (with a chevron when it links somewhere),
// then the number and its label stacked - the vertical layout keeps long
// labels from crowding the figure the way the old side-by-side cards did.
function StatTile({
  icon: Icon,
  value,
  label,
  href,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  href?: string;
}) {
  const body = (
    <CardContent className="flex h-full flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
          <Icon className="h-4 w-4" />
        </span>
        {href && <ArrowRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />}
      </div>
      <div>
        <div className="text-xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
          {value}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      </div>
    </CardContent>
  );
  const card = (
    <Card
      className={cn(
        "h-full",
        href && "transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
      )}
    >
      {body}
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

export default async function AdminDashboardPage() {
  const session = await requireReviewer();
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
      take: 4,
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
      take: 6,
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
  ]);

  // One unified metrics grid: a headline "Total Records" hero, then the
  // remaining stats + the clickable workspace shortcuts as uniform tiles.
  const dict = await getT();
  const t = dict.dashboard;
  const locale = await getLocale();
  const fmtMoney = (n: number) => `${currencySymbol}${moneyNumber.format(n)}`;
  const isAdmin = session.user.role === "ADMIN";

  const tiles: {
    label: string;
    value: number;
    icon: LucideIcon;
    href?: string;
  }[] = [
    { label: t.tileTodayJobs, value: todayJobs, icon: CalendarClock, href: "/admin/schedule" },
    { label: t.tileThisWeek, value: recordsThisWeek, icon: CalendarDays },
    { label: t.tileThisMonth, value: recordsThisMonth, icon: CalendarRange },
    { label: t.tileActiveWorkers, value: activeWorkers, icon: Users },
    { label: t.tileActiveProjects, value: activeProjects, icon: FolderKanban, href: "/admin/projects" },
    { label: t.tilePhotos, value: photoCount, icon: Images, href: "/admin/photos" },
    { label: t.tileTeams, value: teamCount, icon: Users2, href: "/admin/teams" },
  ];

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

      {isAdmin && (
        <div className="flex flex-wrap gap-2 animate-fade-up" style={{ animationDelay: "20ms" }}>
          {[
            { href: "/admin/schedule", label: dict.nav.schedule, icon: CalendarPlus },
            { href: "/admin/projects/new", label: dict.nav.newProject, icon: FolderPlus },
            { href: "/admin/workers/new", label: dict.nav.newWorker, icon: UserPlus },
            { href: "/admin/teams/new", label: dict.nav.newTeam, icon: Users2 },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <a.icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              {a.label}
            </Link>
          ))}
        </div>
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
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t.nothingWaiting}
                </div>
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
      </section>

      {todaySchedule.length > 0 && (
        <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
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
                  ? `${formatTime(job.startTime)}${job.endTime ? `–${formatTime(job.endTime)}` : ""}`
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
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.overview}
        </h2>
        {/* Two headline totals side by side... */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
                  {totalRecords}
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">{t.totalRecords}</div>
              </div>
            </CardContent>
          </Card>
          <Link href="/admin/reports" className="block">
            <Card className="h-full transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                    <DollarSign className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100">
                    {fmtMoney(payReport.grand.total)}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">{t.toPayThisMonth}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        {/* ...then the compact stat tiles, three across. */}
        <div className="grid grid-cols-3 gap-3">
          {tiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </div>
      </section>

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
          {t.recentActivity}
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>{t.recentRecords}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={t.noRecordsYet}
                description={t.noRecordsYetDesc}
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
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.trends}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <TrendingUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <CardTitle>
                {t.recordsPerWeek.replace("{n}", String(WEEKS_BACK))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                data={weekBuckets}
                emptyLabel={t.noRecordsPeriod}
                labelWidth="4rem"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <DollarSign className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <CardTitle>
                {t.topPay}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarList
                data={payData}
                formatValue={fmtMoney}
                emptyLabel={t.noPayMonth}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Wrench className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <CardTitle>
                {t.workByType.replace("{n}", String(TYPE_WINDOW_MONTHS))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarList data={typeData} emptyLabel={t.noRecordsYet} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
