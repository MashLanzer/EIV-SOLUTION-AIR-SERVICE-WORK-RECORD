import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Plus,
  Search,
  SearchX,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SuccessToast } from "@/components/ui/success-toast";
import { FilterChip } from "@/components/ui/filter-chip";
import { StatTile } from "@/components/ui/stat-tile";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { ClearDraftOnMount } from "@/components/records/ClearDraftOnMount";
import { WorkerRecordList } from "@/components/records/WorkerRecordList";
import { ResumeDraftCard } from "@/components/records/ResumeDraftCard";
import { MorningBriefDialog } from "@/components/schedule/MorningBriefDialog";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { addUtcDays, dayKey, getScheduledJobs, startOfUtcDay } from "@/lib/schedule";
import { formatMoney, workMinutes } from "@/lib/format";
import { getCurrencySymbol } from "@/lib/currency";
import { getT } from "@/lib/i18n/server";
import type { RecordStatus } from "@prisma/client";

type DateRange = "week" | "month" | "all";

const WORKER_STATUSES: RecordStatus[] = ["SUBMITTED", "APPROVED", "NEEDS_CHANGES"];

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    saved?: string;
    page?: string;
    status?: string;
    sort?: string;
    range?: string;
  }>;
}) {
  const session = await requireAuth();
  const {
    q,
    saved,
    page: rawPage,
    status: rawStatus,
    sort: rawSort,
    range: rawRange,
  } = await searchParams;
  const query = q?.trim() || undefined;
  const status = WORKER_STATUSES.includes(rawStatus as RecordStatus)
    ? (rawStatus as RecordStatus)
    : undefined;
  // Oldest-first is opt-in; newest-first stays the default view.
  const sort = rawSort === "oldest" ? "oldest" : "newest";
  // Date range filter (worker-friendly equivalent of the admin date filters).
  const range: DateRange = rawRange === "week" || rawRange === "month" ? rawRange : "all";
  const page = parsePage(rawPage);

  // Local-midnight cutoffs for the range chips: Monday for the week, day 1 for
  // the month. Reused below to bound both the list and the earnings total.
  const now = new Date();
  const weekStart = new Date(now);
  // getDay(): 0=Sun..6=Sat; shift back to Monday.
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const rangeMonthStart = new Date(now);
  rangeMonthStart.setDate(1);
  rangeMonthStart.setHours(0, 0, 0, 0);
  const rangeCutoff =
    range === "week" ? weekStart : range === "month" ? rangeMonthStart : undefined;
  const rangeFilter = rangeCutoff ? { date: { gte: rangeCutoff } } : {};

  const where = {
    organizationId: requireOrgId(session),
    submittedById: session.user.id,
    ...(status ? { status } : {}),
    ...rangeFilter,
    ...(query
      ? {
          OR: [
            { jobNumber: { contains: query, mode: "insensitive" as const } },
            { customerName: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Summary stats for this worker (unaffected by the search box): activity this
  // calendar month, plus how many records were returned for changes overall.
  const mine = {
    organizationId: requireOrgId(session),
    submittedById: session.user.id,
  };
  // Per-status counts for the chips: honor the search term but not the status
  // filter itself, so each chip shows how many it would land on.
  const whereNoStatus = {
    ...mine,
    ...rangeFilter,
    ...(query
      ? {
          OR: [
            { jobNumber: { contains: query, mode: "insensitive" as const } },
            { customerName: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  // Same calendar month a year? no — the previous month, for the trend deltas.
  const lastMonthStart = new Date(monthStart);
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

  const [
    total,
    records,
    monthTotal,
    approvedThisMonth,
    needsChanges,
    statusCounts,
    monthTimes,
    prevMonthTotal,
    prevApproved,
    payAgg,
    currency,
  ] = await Promise.all([
    prisma.workRecord.count({ where }),
    prisma.workRecord.findMany({
      where,
      // Keep signature/photo payloads out of the list query
      select: {
        id: true,
        jobNumber: true,
        date: true,
        customerName: true,
        customerAddress: true,
        typeOfWork: true,
        status: true,
        reviewNote: true,
        arrivalTime: true,
        departureTime: true,
        customerRating: true,
        customerFeedback: true,
        _count: { select: { photos: true } },
      },
      orderBy: { date: sort === "oldest" ? "asc" : "desc" },
      ...paginationArgs(page),
    }),
    prisma.workRecord.count({ where: { ...mine, date: { gte: monthStart } } }),
    prisma.workRecord.count({
      where: { ...mine, status: "APPROVED", date: { gte: monthStart } },
    }),
    prisma.workRecord.count({ where: { ...mine, status: "NEEDS_CHANGES" } }),
    prisma.workRecord.groupBy({
      by: ["status"],
      where: whereNoStatus,
      _count: { _all: true },
    }),
    // Just the times for this month's records, to total the hours on site.
    prisma.workRecord.findMany({
      where: { ...mine, date: { gte: monthStart } },
      select: { arrivalTime: true, departureTime: true },
    }),
    // Last month's counts, for the trend deltas on the tiles.
    prisma.workRecord.count({
      where: { ...mine, date: { gte: lastMonthStart, lt: monthStart } },
    }),
    prisma.workRecord.count({
      where: { ...mine, status: "APPROVED", date: { gte: lastMonthStart, lt: monthStart } },
    }),
    // Earnings for the current filtered view — the worker is the lead installer
    // on the records they submit, so leadInstallerPay is their pay.
    prisma.workRecord.aggregate({ where, _sum: { leadInstallerPay: true } }),
    getCurrencySymbol(requireOrgId(session)),
  ]);
  const pages = pageCount(total);
  const earnedTotal = Number(payAgg._sum.leadInstallerPay ?? 0);
  // Hours logged this calendar month, rounded to whole hours for the sub-line.
  const monthMinutes = monthTimes.reduce(
    (sum, r) => sum + workMinutes(r.arrivalTime, r.departureTime),
    0
  );
  const monthHours = Math.round(monthMinutes / 60);
  const countByStatus = new Map<RecordStatus, number>(
    statusCounts.map((s) => [s.status, s._count._all])
  );
  const allCount = statusCounts.reduce((sum, s) => sum + s._count._all, 0);
  // The summary is a "home" thing - hide it while searching or filtering.
  const showSummary = !query && !status && range === "all";
  // Any active filter (search, status, or date range) puts us in "results" mode.
  const filtering = Boolean(query) || Boolean(status) || range !== "all";

  // Today's scheduled visits feed the once-a-day morning brief dialog.
  const todayStart = startOfUtcDay(new Date());
  const briefRaw = await getScheduledJobs({
    session,
    organizationId: requireOrgId(session),
    from: todayStart,
    to: addUtcDays(todayStart, 1),
  });
  const briefJobs = briefRaw
    .filter((j) => j.status !== "CANCELED")
    .map((j) => ({
      id: j.id,
      title: j.title,
      startTime: j.startTime,
      customerName: j.customer?.name ?? null,
      projectName: j.project?.name ?? null,
    }));

  const t = (await getT()).records;

  // Quick status chips, keeping any active search term.
  const statusChips: { label: string; status?: RecordStatus }[] = [
    { label: t.all },
    { label: t.toFix, status: "NEEDS_CHANGES" },
    { label: t.pending, status: "SUBMITTED" },
    { label: t.approved, status: "APPROVED" },
  ];
  function chipHref(next?: RecordStatus) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (next) p.set("status", next);
    if (sort === "oldest") p.set("sort", sort);
    if (range !== "all") p.set("range", range);
    const qs = p.toString();
    return qs ? `/records?${qs}` : "/records";
  }
  // Sort toggle keeps the active search + status filter; resets to page 1.
  function sortHref(next: "newest" | "oldest") {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (status) p.set("status", status);
    if (next === "oldest") p.set("sort", next);
    if (range !== "all") p.set("range", range);
    const qs = p.toString();
    return qs ? `/records?${qs}` : "/records";
  }
  // Date range toggle keeps the active search + status + sort; resets to page 1.
  function rangeHref(next: DateRange) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (status) p.set("status", status);
    if (sort === "oldest") p.set("sort", sort);
    if (next !== "all") p.set("range", next);
    const qs = p.toString();
    return qs ? `/records?${qs}` : "/records";
  }
  const sortChips: { label: string; value: "newest" | "oldest" }[] = [
    { label: t.sortNewest, value: "newest" },
    { label: t.sortOldest, value: "oldest" },
  ];
  const rangeChips: { label: string; value: DateRange }[] = [
    { label: t.rangeAll, value: "all" },
    { label: t.thisMonth, value: "month" },
    { label: t.rangeWeek, value: "week" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <MorningBriefDialog
        jobs={briefJobs}
        dayKey={dayKey(todayStart)}
        userId={session.user.id}
      />
      {saved && (
        <>
          <SuccessToast message={t.recordSaved} />
          <ClearDraftOnMount draftKey={`new-record:${session.user.id}`} />
        </>
      )}

      <PageHeader
        title={t.myRecords}
        action={
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/records/new">
              <Plus className="h-4 w-4" />
              {t.newRecord}
            </Link>
          </Button>
        }
      />

      {showSummary && <ResumeDraftCard draftKey={`new-record:${session.user.id}`} />}

      {showSummary && (
        <div className="grid animate-fade-up grid-cols-3 gap-3 sm:gap-4">
          <StatTile
            icon={ClipboardList}
            value={monthTotal}
            label={t.thisMonth}
            sub={monthHours > 0 ? t.hoursOnSite.replace("{h}", String(monthHours)) : undefined}
            delta={<DeltaBadge current={monthTotal} previous={prevMonthTotal} />}
          />
          <StatTile
            icon={CheckCircle2}
            value={approvedThisMonth}
            label={t.approved}
            tone="success"
            href="/records?status=APPROVED"
            delta={<DeltaBadge current={approvedThisMonth} previous={prevApproved} />}
          />
          <StatTile
            icon={AlertTriangle}
            value={needsChanges}
            label={t.toFix}
            tone={needsChanges > 0 ? "warning" : "default"}
            href={needsChanges > 0 ? "/records?status=NEEDS_CHANGES" : undefined}
          />
        </div>
      )}

      {showSummary && needsChanges > 0 && (
        <Link href="/records?status=NEEDS_CHANGES" className="block">
          <Alert variant="warning" className="transition-opacity hover:opacity-90">
            {(needsChanges === 1 ? t.needsBannerOne : t.needsBannerMany).replace(
              "{n}",
              String(needsChanges)
            )}
          </Alert>
        </Link>
      )}

      <form method="get" className="relative">
        {status && <input type="hidden" name="status" value={status} />}
        {sort === "oldest" && <input type="hidden" name="sort" value={sort} />}
        {range !== "all" && <input type="hidden" name="range" value={range} />}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
        <Input
          type="search"
          name="q"
          placeholder={t.searchPlaceholder}
          defaultValue={query}
          className="pl-9"
          aria-label={t.searchAria}
        />
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {statusChips.map((chip) => {
          const active = (chip.status ?? undefined) === (status ?? undefined);
          const count = chip.status ? countByStatus.get(chip.status) ?? 0 : allCount;
          return (
            <FilterChip key={chip.label} href={chipHref(chip.status)} active={active} count={count}>
              {chip.label}
            </FilterChip>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {rangeChips.map((chip) => (
          <FilterChip key={chip.value} href={rangeHref(chip.value)} active={range === chip.value}>
            {chip.label}
          </FilterChip>
        ))}
      </div>

      {records.length === 0 ? (
        filtering ? (
          <EmptyState
            icon={SearchX}
            title={t.noMatches}
            description={query ? t.nothingFound.replace("{q}", query) : t.noRecordsInView}
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link href="/records">{t.clearFilters}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={t.noRecordsYet}
            description={t.noRecordsYetDesc}
            action={
              <Button asChild className="mt-2 sm:hidden">
                <Link href="/records/new">
                  <Plus className="h-4 w-4" />
                  {t.newRecord}
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          {/* Results eyebrow (count + earned) on the left, sort toggle on the
              right — keeps sort accessible without a whole extra chip row. */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {(total === 1 ? t.recordCountOne : t.recordCountMany).replace("{n}", String(total))}
              {earnedTotal > 0 && (
                <span className="normal-case text-neutral-400 dark:text-neutral-500">
                  {" · "}
                  {t.earned} {formatMoney(earnedTotal, currency)}
                </span>
              )}
            </h2>
            <div className="flex shrink-0 gap-1.5">
              {sortChips.map((chip) => (
                <FilterChip key={chip.value} href={sortHref(chip.value)} active={sort === chip.value}>
                  {chip.label}
                </FilterChip>
              ))}
            </div>
          </div>
          <WorkerRecordList
            records={records.map((record) => ({
              ...record,
              photoCount: record._count.photos,
            }))}
          />
          <Pagination
            page={page}
            pageCount={pages}
            basePath="/records"
            params={{
              q: query,
              status,
              sort: sort === "oldest" ? sort : undefined,
              range: range !== "all" ? range : undefined,
            }}
          />
        </>
      )}
    </div>
  );
}
