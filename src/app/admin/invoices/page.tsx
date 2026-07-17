import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  Download,
  Plus,
  Receipt,
  Search,
  SearchX,
} from "lucide-react";

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
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { computeTotals, formatInvoiceNumber, isOverdue, INVOICE_STATUSES } from "@/lib/invoices";
import { requireOrgId } from "@/lib/orgScope";
import { requireFeature } from "@/lib/features";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";
import type { InvoiceStatus } from "@prisma/client";

function startOfMonth(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "invoicing");
  const { q, status: rawStatus } = await searchParams;
  const query = q?.trim().toLowerCase() || undefined;
  const status = INVOICE_STATUSES.includes(rawStatus as InvoiceStatus)
    ? (rawStatus as InvoiceStatus)
    : undefined;
  // "overdue" is a derived pseudo-status (not stored) so it gets its own flag.
  const overdueFilter = rawStatus === "overdue";

  const [rows, currency] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId },
      orderBy: [{ issueDate: "desc" }, { number: "desc" }],
      take: 500,
      select: {
        id: true,
        number: true,
        status: true,
        customerName: true,
        issueDate: true,
        dueDate: true,
        paidAt: true,
        taxRate: true,
        lineItems: { select: { quantity: true, unitPrice: true } },
      },
    }),
    getCurrencySymbol(organizationId),
  ]);

  const now = new Date();
  const monthStart = startOfMonth();
  const invoices = rows.map((inv) => {
    const total = computeTotals(
      inv.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
      Number(inv.taxRate)
    ).total;
    return {
      id: inv.id,
      number: inv.number,
      status: inv.status,
      customerName: inv.customerName,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      total,
      overdue: isOverdue(inv.status, inv.dueDate, now),
    };
  });

  // Summary across all invoices (unaffected by the search/status filter).
  const outstanding = invoices
    .filter((i) => i.status === "SENT")
    .reduce((s, i) => s + i.total, 0);
  const paidThisMonth = invoices
    .filter((i) => i.status === "PAID" && i.paidAt && i.paidAt >= monthStart)
    .reduce((s, i) => s + i.total, 0);
  const overdueCount = invoices.filter((i) => i.overdue).length;

  const countByStatus = new Map<InvoiceStatus, number>();
  for (const s of INVOICE_STATUSES) countByStatus.set(s, 0);
  for (const i of invoices) countByStatus.set(i.status, (countByStatus.get(i.status) ?? 0) + 1);

  const dict = await getT();
  const t = dict.invoices;
  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const money = (n: number) => `${currency}${n.toFixed(2)}`;

  const filtered = invoices.filter((i) => {
    if (status && i.status !== status) return false;
    if (overdueFilter && !i.overdue) return false;
    if (query) {
      const hay = `${formatInvoiceNumber(i.number)} ${i.customerName}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  // Total value of the current view, so the office reads the money for a filter
  // (e.g. everything still SENT) without exporting.
  const filteredValue = filtered.reduce((s, i) => s + i.total, 0);

  const activeStatus: InvoiceStatus | "overdue" | undefined = overdueFilter ? "overdue" : status;

  // The CSV export mirrors the active search + status (or overdue) filter.
  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", q!.trim());
  if (activeStatus) exportParams.set("status", activeStatus);
  const exportQuery = exportParams.toString() ? `?${exportParams.toString()}` : "";

  const chipHref = (next?: InvoiceStatus | "overdue") => {
    const p = new URLSearchParams();
    if (query) p.set("q", q!.trim());
    if (next) p.set("status", next);
    const s = p.toString();
    return s ? `/admin/invoices?${s}` : "/admin/invoices";
  };
  const statusChips: { label: string; status?: InvoiceStatus | "overdue"; count: number }[] = [
    { label: t.chipAll, count: invoices.length },
    { label: t.statusDraft, status: "DRAFT", count: countByStatus.get("DRAFT") ?? 0 },
    { label: t.statusSent, status: "SENT", count: countByStatus.get("SENT") ?? 0 },
    { label: t.statusPaid, status: "PAID", count: countByStatus.get("PAID") ?? 0 },
    { label: t.statusVoid, status: "VOID", count: countByStatus.get("VOID") ?? 0 },
    { label: t.chipOverdue, status: "overdue", count: overdueCount },
  ];

  const showSummary = !query && !status && !overdueFilter && invoices.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.title}
        action={
          <div className="flex items-center gap-2">
            {invoices.length > 0 && (
              <Button asChild variant="outline">
                <a href={`/admin/invoices/export${exportQuery}`}>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.exportCsv}</span>
                </a>
              </Button>
            )}
            <Button asChild>
              <Link href="/admin/invoices/new">
                <Plus className="h-4 w-4" />
                {t.newInvoice}
              </Link>
            </Button>
          </div>
        }
      />

      {showSummary && (
        <div className="grid animate-fade-up grid-cols-3 gap-3 sm:gap-4">
          <StatTile icon={CircleDollarSign} value={money(outstanding)} label={t.outstanding} />
          <StatTile
            icon={CircleDollarSign}
            value={money(paidThisMonth)}
            label={t.paidThisMonth}
            tone="success"
          />
          <StatTile
            icon={AlertTriangle}
            value={overdueCount}
            label={t.overdueCount}
            tone={overdueCount > 0 ? "warning" : "default"}
          />
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
        {statusChips.map((chip) => {
          const active = (chip.status ?? undefined) === (activeStatus ?? undefined);
          return (
            <FilterChip key={chip.label} href={chipHref(chip.status)} active={active} count={chip.count}>
              {chip.label}
            </FilterChip>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t.noneYet}
            description={t.noneYetDesc}
            action={
              <Button asChild className="mt-2">
                <Link href="/admin/invoices/new">
                  <Plus className="h-4 w-4" />
                  {t.newInvoice}
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
                <Link href="/admin/invoices">{t.clearFilters}</Link>
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
                      <TableHead>{t.colDue}</TableHead>
                      <TableHead className="text-right">{t.colTotal}</TableHead>
                      <TableHead>{t.colStatus}</TableHead>
                      <TableHead className="text-right sr-only">{dict.common.view}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                          <Link href={`/admin/invoices/${i.id}`} className="hover:text-primary">
                            {formatInvoiceNumber(i.number)}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[16rem] truncate">{i.customerName}</TableCell>
                        <TableCell className="tabular-nums text-neutral-500 dark:text-neutral-400">
                          {dateFmt.format(i.issueDate)}
                        </TableCell>
                        <TableCell className="tabular-nums text-neutral-500 dark:text-neutral-400">
                          {i.dueDate ? (
                            <span className={i.overdue ? "font-medium text-warning-text" : undefined}>
                              {dateFmt.format(i.dueDate)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{money(i.total)}</TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={i.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="icon">
                            <Link href={`/admin/invoices/${i.id}`} aria-label={formatInvoiceNumber(i.number)}>
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
            {filtered.map((i) => (
              <Card key={i.id}>
                <Link
                  href={`/admin/invoices/${i.id}`}
                  className="flex items-start gap-3 p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    <Receipt className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                        {formatInvoiceNumber(i.number)}
                      </span>
                      <InvoiceStatusBadge status={i.status} />
                    </div>
                    <div className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {i.customerName}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="tabular-nums">
                        {dateFmt.format(i.issueDate)}
                        {i.dueDate ? (
                          <span className={i.overdue ? "font-medium text-warning-text" : undefined}>
                            {" "}· {t.due} {dateFmt.format(i.dueDate)}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                        {money(i.total)}
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
