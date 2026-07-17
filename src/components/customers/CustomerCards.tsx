"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarDays, ChevronRight, ClipboardList, Mail, MapPin, Phone } from "lucide-react";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useT } from "@/components/i18n/LocaleProvider";

export interface CustomerPeek {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  jobCount: number;
  jobCountLabel: string;
  lastVisitLabel: string | null;
}

// The mobile customer list: each card opens a quick-peek bottom sheet with the
// customer's contact details and stats, plus a shortcut into their full
// history. Desktop keeps the sortable table (rendered by the page).
export function CustomerCards({ customers }: { customers: CustomerPeek[] }) {
  const t = useT().customers;
  const tc = useT().common;
  const [peek, setPeek] = useState<CustomerPeek | null>(null);

  const mapsHref = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <div className="flex flex-col gap-3 sm:hidden">
      {customers.map((c) => (
        <Card key={c.id}>
          <button
            type="button"
            onClick={() => setPeek(c)}
            className="flex w-full items-start gap-3 p-4 text-left transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
          >
            <AvatarInitials name={c.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                  {c.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  {c.jobCountLabel}
                </span>
              </div>
              <div className="mt-0.5 flex items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{c.address}</span>
              </div>
              {c.lastVisitLabel && (
                <div className="mt-0.5 text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                  {t.colLastVisit}: {c.lastVisitLabel}
                </div>
              )}
            </div>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
          </button>
        </Card>
      ))}

      <BottomSheet open={peek !== null} onClose={() => setPeek(null)} title={peek?.name ?? ""} closeLabel={tc.close}>
        {peek && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <AvatarInitials name={peek.name} className="h-12 w-12 shrink-0" />
              <div className="min-w-0 flex-1">
                <a
                  href={mapsHref(peek.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-start gap-1.5 text-sm text-neutral-500 hover:text-primary dark:text-neutral-400"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{peek.address}</span>
                </a>
              </div>
            </div>

            {/* Contact shortcuts */}
            {(peek.phone || peek.email) && (
              <div className="flex flex-col gap-2">
                {peek.phone && (
                  <a
                    href={`tel:${peek.phone}`}
                    className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-200"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    {peek.phone}
                  </a>
                )}
                {peek.email && (
                  <a
                    href={`mailto:${peek.email}`}
                    className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-200"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    <span className="min-w-0 truncate">{peek.email}</span>
                  </a>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <ClipboardList className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <div>
                  <div className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {peek.jobCount}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {t.colJobs}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <CalendarDays className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {peek.lastVisitLabel ?? "—"}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {t.colLastVisit}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <Button asChild className="w-full">
                <Link href={`/admin/customers/${peek.id}`}>
                  {t.colHistory}
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
