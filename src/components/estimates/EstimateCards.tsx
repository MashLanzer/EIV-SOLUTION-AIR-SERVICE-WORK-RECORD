"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarDays, ChevronRight, FileText, User } from "lucide-react";
import type { EstimateStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EstimateStatusBadge } from "@/components/estimates/EstimateStatusBadge";
import { useT } from "@/components/i18n/LocaleProvider";

export interface EstimatePeek {
  id: string;
  numberLabel: string;
  status: EstimateStatus;
  customerName: string;
  issuedLabel: string;
  expiresLabel: string | null;
  expired: boolean;
  totalLabel: string;
}

// Mobile estimate list: each card opens a quick-peek bottom sheet with the
// estimate summary (customer, dates, total) and a shortcut to open it. Desktop
// keeps the table (rendered by the page).
export function EstimateCards({ estimates }: { estimates: EstimatePeek[] }) {
  const t = useT().estimates;
  const tc = useT().common;
  const [peek, setPeek] = useState<EstimatePeek | null>(null);

  return (
    <div className="flex flex-col gap-3 sm:hidden">
      {estimates.map((e) => (
        <Card key={e.id}>
          <button
            type="button"
            onClick={() => setPeek(e)}
            className="flex w-full items-start gap-3 p-4 text-left transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {e.numberLabel}
                </span>
                <EstimateStatusBadge status={e.status} />
              </div>
              <div className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                {e.customerName}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="tabular-nums">{e.issuedLabel}</span>
                <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                  {e.totalLabel}
                </span>
              </div>
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
          </button>
        </Card>
      ))}

      <BottomSheet open={peek !== null} onClose={() => setPeek(null)} title={peek?.numberLabel ?? ""} closeLabel={tc.close}>
        {peek && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <FileText className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {peek.totalLabel}
                </div>
                <EstimateStatusBadge status={peek.status} />
              </div>
            </div>

            <div className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              <Row icon={<User className="h-4 w-4" />} label={t.colCustomer} value={peek.customerName} />
              <Row icon={<CalendarDays className="h-4 w-4" />} label={t.colIssued} value={peek.issuedLabel} />
              <Row
                icon={<CalendarDays className="h-4 w-4" />}
                label={t.colExpires}
                value={peek.expiresLabel ?? "—"}
                warn={peek.expired}
              />
            </div>

            <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <Button asChild className="w-full">
                <Link href={`/admin/estimates/${peek.id}`}>
                  {tc.view}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  warn = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <span className="text-neutral-400 dark:text-neutral-500">{icon}</span>
        {label}
      </span>
      <span
        className={
          "min-w-0 truncate text-right text-sm font-medium tabular-nums " +
          (warn ? "text-warning-text" : "text-neutral-900 dark:text-neutral-100")
        }
      >
        {value}
      </span>
    </div>
  );
}
