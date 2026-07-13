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
import { Pagination } from "@/components/ui/pagination";
import { SuccessToast } from "@/components/ui/success-toast";
import { FilterChip } from "@/components/ui/filter-chip";
import { StatTile } from "@/components/ui/stat-tile";
import { ClearDraftOnMount } from "@/components/records/ClearDraftOnMount";
import { RecordCard } from "@/components/records/RecordCard";
import { MorningBriefDialog } from "@/components/schedule/MorningBriefDialog";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { addUtcDays, dayKey, getScheduledJobs, startOfUtcDay } from "@/lib/schedule";
import { getT } from "@/lib/i18n/server";
import type { RecordStatus } from "@prisma/client";

const WORKER_STATUSES: RecordStatus[] = ["SUBMITTED", "APPROVED", "NEEDS_CHANGES"];

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; saved?: string; page?: string; status?: string }>;
}) {
  const session = await requireAuth();
  const { q, saved, page: rawPage, status: rawStatus } = await searchParams;
  const query = q?.trim() || undefined;
  const status = WORKER_STATUSES.includes(rawStatus as RecordStatus)
    ? (rawStatus as RecordStatus)
    : undefined;
  const page = parsePage(rawPage);

  const where = {
    organizationId: requireOrgId(session),
    submittedById: session.user.id,
    ...(status ? { status } : {}),
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

  const [total, records, monthTotal, approvedThisMonth, needsChanges, statusCounts] =
    await Promise.all([
      prisma.workRecord.count({ where }),
      prisma.workRecord.findMany({
        where,
        // Keep signature/photo payloads out of the list query
        select: {
          id: true,
          jobNumber: true,
          date: true,
          customerName: true,
          typeOfWork: true,
          status: true,
          reviewNote: true,
        },
        orderBy: { date: "desc" },
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
    ]);
  const pages = pageCount(total);
  const countByStatus = new Map<RecordStatus, number>(
    statusCounts.map((s) => [s.status, s._count._all])
  );
  const allCount = statusCounts.reduce((sum, s) => sum + s._count._all, 0);
  // The summary is a "home" thing - hide it while searching or filtering.
  const showSummary = !query && !status;

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
    const qs = p.toString();
    return qs ? `/records?${qs}` : "/records";
  }

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

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t.myRecords}</h1>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/records/new">
            <Plus className="h-4 w-4" />
            {t.newRecord}
          </Link>
        </Button>
      </div>

      {showSummary && (
        <div className="grid animate-fade-up grid-cols-3 gap-3 sm:gap-4">
          <StatTile icon={ClipboardList} value={monthTotal} label={t.thisMonth} />
          <StatTile icon={CheckCircle2} value={approvedThisMonth} label={t.approved} tone="success" />
          <StatTile
            icon={AlertTriangle}
            value={needsChanges}
            label={t.toFix}
            tone={needsChanges > 0 ? "warning" : "default"}
          />
        </div>
      )}

      {showSummary && needsChanges > 0 && (
        <Alert variant="warning">
          {(needsChanges === 1 ? t.needsBannerOne : t.needsBannerMany).replace(
            "{n}",
            String(needsChanges)
          )}
        </Alert>
      )}

      <form method="get" className="relative">
        {status && <input type="hidden" name="status" value={status} />}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
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

      {records.length === 0 ? (
        query || status ? (
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
          <div className="flex flex-col gap-3">
            {records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                href={`/records/${record.id}`}
              />
            ))}
          </div>
          <Pagination
            page={page}
            pageCount={pages}
            basePath="/records"
            params={{ q: query, status }}
          />
        </>
      )}
    </div>
  );
}
