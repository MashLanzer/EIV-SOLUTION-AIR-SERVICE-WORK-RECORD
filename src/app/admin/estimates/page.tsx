import Link from "next/link";
import { ArrowRight, ChevronRight, ClipboardList, CircleDollarSign, FileText, Plus, Search, SearchX, Sheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { MobileCardList } from "@/components/ui/responsive-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EstimateStatusBadge } from "@/components/estimates/EstimateStatusBadge";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { computeTotals } from "@/lib/invoices";
import { ESTIMATE_STATUSES, formatEstimateNumber, isEstimateExpired } from "@/lib/estimates";
import { requireOrgId } from "@/lib/orgScope";
import { requireFeature } from "@/lib/features";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";
import type { EstimateStatus } from "@prisma/client";

export default async function AdminEstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requirePermission("estimates.manage");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "estimates");
  const { q, status: rawStatus } = await searchParams;
  const query = q?.trim().toLowerCase() || undefined;
  const status = ESTIMATE_STATUSES.includes(rawStatus as EstimateStatus)
    ? (rawStatus as EstimateStatus)
    : undefined;
  // "expired" is a derived pseudo-status (not stored) so it gets its own flag.
  const expiredFilter = rawStatus === "expired";

  const [rows, currency] = await Promise.all([
    prisma.estimate.findMany({
      where: { organizationId },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      take: 500,
      select: {
        id: true,
        number: true,
        status: true,
        customerName: true,
        issueDate: true,
        expiryDate: true,
        taxRate: true,
        lineItems: { select: { quantity: true, unitPrice: true } },
      },
    }),
    getCurrencySymbol(organizationId),
  ]);

  const now = new Date();
  const estimates = rows.map((e) => ({
    id: e.id,
    number: e.number,
    status: e.status,
    customerName: e.customerName,
    issueDate: e.issueDate,
    expiryDate: e.expiryDate,
    total: computeTotals(
      e.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
      Number(e.taxRate)
    ).total,
    expired: isEstimateExpired(e.status, e.expiryDate, now),
  }));

  const pending = estimates.filter((e) => e.status === "SENT").length;
  const acceptedValue = estimates
    .filter((e) => e.status === "ACCEPTED")
    .reduce((s, e) => s + e.total, 0);

  const countByStatus = new Map<EstimateStatus, number>();
  for (const s of ESTIMATE_STATUSES) countByStatus.set(s, 0);
  for (const e of estimates) countByStatus.set(e.status, (countByStatus.get(e.status) ?? 0) + 1);
  const expiredCount = estimates.filter((e) => e.expired).length;

  const dict = await getT();
  const t = dict.estimates;
  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const money = (n: number) => `${currency}${n.toFixed(2)}`;

  const filtered = estimates.filter((e) => {
    if (status && e.status !== status) return false;
    if (expiredFilter && !e.expired) return false;
    if (query) {
      const hay = `${formatEstimateNumber(e.number)} ${e.customerName}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  // Total value of the current view, so the office reads the money for a filter
  // (e.g. everything still SENT) without exporting.
  const filteredValue = filtered.reduce((s, e) => s + e.total, 0);

  const chipHref = (next?: EstimateStatus | "expired") => {
    const p = new URLSearchParams();
    if (query) p.set("q", q!.trim());
    if (next) p.set("status", next);
    const s = p.toString();
    return s ? `/admin/estimates?${s}` : "/admin/estimates";
  };
  const chips: { label: string; status?: EstimateStatus | "expired"; count: number }[] = [
    { label: t.chipAll, count: estimates.length },
    { label: t.statusDraft, status: "DRAFT", count: countByStatus.get("DRAFT") ?? 0 },
    { label: t.statusSent, status: "SENT", count: countByStatus.get("SENT") ?? 0 },
    { label: t.statusAccepted, status: "ACCEPTED", count: countByStatus.get("ACCEPTED") ?? 0 },
    { label: t.statusDeclined, status: "DECLINED", count: countByStatus.get("DECLINED") ?? 0 },
    { label: t.chipExpired, status: "expired", count: expiredCount },
  ];
  const activeStatus = expiredFilter ? "expired" : status;
  const showSummary = !query && !status && !expiredFilter && estimates.length > 0;

  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", q!.trim());
  if (activeStatus) exportParams.set("status", activeStatus);
  const exportHref = `/admin/estimates/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.title}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={exportHref}>
                <Sheet className="h-4 w-4" />
                <span className="hidden sm:inline">{t.exportCsv}</span>
              </a>
            </Button>
            <Button asChild>
              <Link href="/admin/estimates/new">
                <Plus className="h-4 w-4" />
                {t.newEstimate}
              </Link>
            </Button>
          </div>
        }
      />

      {showSummary && (
        <div className="grid animate-fade-up grid-cols-2 gap-3 sm:gap-4">
          <StatTile icon={ClipboardList} value={pending} label={t.pending} />
          <StatTile icon={CircleDollarSign} value={money(acceptedValue)} label={t.acceptedValue} tone="success" />
        </div>
      )}

      <form method="get" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        <Input
          type="search"
          name="q"
          placeholder={t.searchPlaceholder}
          defaultValue={q ?? ""}
          className="pl-9"
          aria-label={t.searchAria}
        />
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => {
          const active = (chip.status ?? undefined) === (activeStatus ?? undefined);
          return (
            <FilterChip key={chip.label} href={chipHref(chip.status)} active={active} count={chip.count}>
              {chip.label}
            </FilterChip>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        estimates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t.noneYet}
            description={t.noneYetDesc}
            action={
              <Button asChild className="mt-2">
                <Link href="/admin/estimates/new">
                  <Plus className="h-4 w-4" />
                  {t.newEstimate}
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title={t.noMatches}
            description={t.noMatchesDesc}
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link href="/admin/estimates">{t.clearFilters}</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {(filtered.length === 1 ? t.resultCountOne : t.resultCountMany).replace(
                "{n}",
                String(filtered.length)
              )}
            </h2>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {t.filteredValue}{" "}
              <span className="font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
                {money(filteredValue)}
              </span>
            </span>
          </div>
          <div className="hidden sm:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.colNumber}</TableHead>
                      <TableHead>{t.colCustomer}</TableHead>
                      <TableHead>{t.colIssued}</TableHead>
                      <TableHead>{t.colExpires}</TableHead>
                      <TableHead className="text-right">{t.colTotal}</TableHead>
                      <TableHead>{t.colStatus}</TableHead>
                      <TableHead className="text-right sr-only">{dict.common.view}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                          <Link href={`/admin/estimates/${e.id}`} className="hover:text-primary">
                            {formatEstimateNumber(e.number)}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[16rem] truncate">{e.customerName}</TableCell>
                        <TableCell className="tabular-nums text-neutral-500 dark:text-neutral-400">
                          {dateFmt.format(e.issueDate)}
                        </TableCell>
                        <TableCell className="tabular-nums text-neutral-500 dark:text-neutral-400">
                          {e.expiryDate ? (
                            <span className={e.expired ? "font-medium text-warning-text" : undefined}>
                              {dateFmt.format(e.expiryDate)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{money(e.total)}</TableCell>
                        <TableCell>
                          <EstimateStatusBadge status={e.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="icon">
                            <Link href={`/admin/estimates/${e.id}`} aria-label={formatEstimateNumber(e.number)}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <MobileCardList>
            {filtered.map((e) => (
              <Card key={e.id}>
                <Link
                  href={`/admin/estimates/${e.id}`}
                  className="flex items-start gap-3 p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                        {formatEstimateNumber(e.number)}
                      </span>
                      <EstimateStatusBadge status={e.status} />
                    </div>
                    <div className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {e.customerName}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="tabular-nums">{dateFmt.format(e.issueDate)}</span>
                      <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                        {money(e.total)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                </Link>
              </Card>
            ))}
          </MobileCardList>
        </>
      )}
    </div>
  );
}
