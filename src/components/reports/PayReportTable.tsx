"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { ArrowRight, DollarSign, Loader2, Search } from "lucide-react";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWorkerPayBreakdownAction, type WorkerPayBreakdown } from "@/actions/reports";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { formatMoney } from "@/lib/format";

interface Row {
  name: string;
  jobs: number;
  leadTotal: number;
  helperTotal: number;
  total: number;
}
interface Grand {
  jobs: number;
  leadTotal: number;
  helperTotal: number;
  total: number;
}

// The pay-report rows as an interactive table (desktop) / card list (mobile):
// filter by person, and tap a row to open a bottom sheet with the per-job
// breakdown behind that person's pay, each line linked to its record.
export function PayReportTable({
  rows,
  grand,
  currency,
  dateFrom,
  dateTo,
}: {
  rows: Row[];
  grand: Grand;
  currency: string;
  dateFrom: string;
  dateTo: string;
}) {
  const t = useT().reports;
  const tr = useT().records;
  const tc = useT().common;
  const locale = useLocale();
  const money = (n: number) => formatMoney(n, currency);
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, WorkerPayBreakdown>>({});
  const [pending, startTransition] = useTransition();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  function openBreakdown(name: string) {
    setOpen(name);
    if (!cache[name]) {
      startTransition(async () => {
        const data = await getWorkerPayBreakdownAction(name, dateFrom, dateTo);
        setCache((prev) => ({ ...prev, [name]: data }));
      });
    }
  }

  const active = open ? cache[open] : undefined;
  const showGrand = query.trim() === "";

  return (
    <>
      {rows.length > 4 && (
        <div className="relative border-b border-neutral-100 p-3 dark:border-neutral-800">
          <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPerson}
            aria-label={t.searchPerson}
            className="pl-9"
          />
        </div>
      )}

      {shown.length === 0 ? (
        <p className="p-6 text-center text-sm text-neutral-500 dark:text-neutral-400">{t.noMatches}</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.colPerson}</TableHead>
                  <TableHead>{t.colJobs}</TableHead>
                  <TableHead className="text-right">{t.colLeadPay}</TableHead>
                  <TableHead className="text-right">{t.colHelperPay}</TableHead>
                  <TableHead className="text-right">{t.colTotal}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((row) => (
                  <TableRow
                    key={row.name.toLowerCase()}
                    onClick={() => openBreakdown(row.name)}
                    className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  >
                    <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                      <span className="flex items-center gap-2">
                        {row.name}
                        <ArrowRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{row.jobs}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.leadTotal)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.helperTotal)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                      {money(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
                {showGrand && (
                  <TableRow className="bg-neutral-50 dark:bg-neutral-800">
                    <TableCell className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {t.grandTotal}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">{grand.jobs}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{money(grand.leadTotal)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{money(grand.helperTotal)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                      {money(grand.total)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 p-4 sm:hidden">
            {shown.map((row) => (
              <button
                key={row.name.toLowerCase()}
                type="button"
                onClick={() => openBreakdown(row.name)}
                className="w-full rounded-xl border border-neutral-200 bg-white text-left transition-colors active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800/60"
              >
                <div className="flex items-center gap-3 p-4">
                  <AvatarInitials name={row.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate font-semibold text-neutral-900 dark:text-neutral-100">
                      {row.name}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <div className="mt-0.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {(row.jobs === 1 ? t.jobCountOne : t.jobCountMany).replace("{n}", String(row.jobs))} ·{" "}
                      {t.leadLabel} {money(row.leadTotal)} · {t.helperLabel} {money(row.helperTotal)}
                    </div>
                  </div>
                  <div className="shrink-0 text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {money(row.total)}
                  </div>
                </div>
              </button>
            ))}
            {showGrand && (
              <Card className="border-primary/30 bg-accent-soft/40">
                <div className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <DollarSign className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">{t.grandTotal}</div>
                    <div className="mt-0.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {(grand.jobs === 1 ? t.jobCountOne : t.jobCountMany).replace("{n}", String(grand.jobs))} ·{" "}
                      {t.leadLabel} {money(grand.leadTotal)} · {t.helperLabel} {money(grand.helperTotal)}
                    </div>
                  </div>
                  <div className="shrink-0 text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {money(grand.total)}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Per-worker breakdown */}
      <BottomSheet open={open !== null} onClose={() => setOpen(null)} title={open ?? ""} closeLabel={tc.close}>
        {pending && !active ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-500 dark:text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.loadingBreakdown}
          </div>
        ) : active ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <SummaryTile label={t.colJobs} value={String(active.jobs)} />
              <SummaryTile label={t.avgPerJob} value={money(active.avgPerJob)} />
              <SummaryTile label={t.colTotal} value={money(active.total)} strong />
            </div>
            {active.lines.length === 0 ? (
              <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                {t.breakdownEmpty}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {active.lines.map((line, i) => (
                  <li key={`${line.recordId}-${line.role}-${i}`}>
                    <Link
                      href={`/admin/records/${line.recordId}`}
                      className="flex items-center gap-3 py-2.5 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                            {tr.jobNumber}
                            {line.jobNumber}
                          </span>
                          <Badge variant={line.role === "lead" ? "default" : "secondary"}>
                            {line.role === "lead" ? t.roleLead : t.roleHelper}
                          </Badge>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                          {dateFmt.format(new Date(`${line.date}T00:00:00Z`))} · {line.customerName}
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                        {money(line.pay)}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
}

function SummaryTile({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-center dark:border-neutral-800 dark:bg-neutral-800/50">
      <div
        className={
          strong
            ? "text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-100"
            : "text-base font-semibold tabular-nums text-neutral-700 dark:text-neutral-200"
        }
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </div>
    </div>
  );
}
