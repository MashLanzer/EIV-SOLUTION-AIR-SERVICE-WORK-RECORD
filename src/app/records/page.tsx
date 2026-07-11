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
import { ClearDraftOnMount } from "@/components/records/ClearDraftOnMount";
import { RecordCard } from "@/components/records/RecordCard";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { cn } from "@/lib/utils";

// Compact summary tile for the worker's home, matching the admin dashboard.
function StatTile({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof ClipboardList;
  value: number;
  label: string;
  tone?: "warning";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          tone === "warning" && value > 0
            ? "bg-warning-soft text-warning-text"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
    </div>
  );
}

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; saved?: string; page?: string }>;
}) {
  const session = await requireAuth();
  const { q, saved, page: rawPage } = await searchParams;
  const query = q?.trim() || undefined;
  const page = parsePage(rawPage);

  const where = {
    organizationId: requireOrgId(session),
    submittedById: session.user.id,
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
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [total, records, monthTotal, approvedThisMonth, needsChanges] =
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
    ]);
  const pages = pageCount(total);
  // The summary is a "home" thing - hide it while actively searching.
  const showSummary = !query;

  return (
    <div className="flex flex-col gap-4">
      {saved && (
        <>
          <SuccessToast message="Record saved" />
          <ClearDraftOnMount draftKey={`new-record:${session.user.id}`} />
        </>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">My Records</h1>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/records/new">
            <Plus className="h-4 w-4" />
            New Record
          </Link>
        </Button>
      </div>

      {showSummary && (
        <div className="grid animate-fade-up grid-cols-3 gap-3">
          <StatTile icon={ClipboardList} value={monthTotal} label="This month" />
          <StatTile icon={CheckCircle2} value={approvedThisMonth} label="Approved" />
          <StatTile
            icon={AlertTriangle}
            value={needsChanges}
            label="To fix"
            tone="warning"
          />
        </div>
      )}

      {showSummary && needsChanges > 0 && (
        <Alert variant="warning">
          <span className="font-medium">
            {needsChanges} record{needsChanges > 1 ? "s" : ""} need
            {needsChanges > 1 ? "" : "s"} changes.
          </span>{" "}
          Fix and resubmit {needsChanges > 1 ? "them" : "it"} below.
        </Alert>
      )}

      <form method="get" className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        <Input
          type="search"
          name="q"
          placeholder="Search by job # or customer"
          defaultValue={query}
          className="pl-9"
          aria-label="Search my records"
        />
      </form>

      {records.length === 0 ? (
        query ? (
          <EmptyState
            icon={SearchX}
            title="No matches"
            description={`Nothing found for "${query}".`}
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link href="/records">Clear search</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No records yet"
            description="Work records you submit will show up here."
            action={
              <Button asChild className="mt-2 sm:hidden">
                <Link href="/records/new">
                  <Plus className="h-4 w-4" />
                  New Record
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
            params={{ q: query }}
          />
        </>
      )}
    </div>
  );
}
