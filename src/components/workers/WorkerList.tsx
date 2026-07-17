"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Mail,
  Settings,
  Wrench,
} from "lucide-react";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";

export interface WorkerPeek {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SUPERVISOR" | "WORKER";
  active: boolean;
  avatarUrl: string | null;
  createdAt: string; // ISO
  skills: string[];
  jobs: number;
  lastActive: string | null; // ISO
}

// One role group (Administrators / Supervisors / Field workers). Tapping a
// row or card opens a bottom sheet with the worker's info + quick actions;
// full management still lives on the detail page.
export function WorkerList({
  title,
  workers,
  className,
  style,
}: {
  title: string;
  workers: WorkerPeek[];
  className?: string;
  style?: React.CSSProperties;
}) {
  const t = useT().workers;
  const tc = useT().common;
  const locale = useLocale();
  const [peek, setPeek] = useState<WorkerPeek | null>(null);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));

  const roleLabel = (role: WorkerPeek["role"]) =>
    role === "ADMIN" ? t.roleAdmin : role === "SUPERVISOR" ? t.roleSupervisor : t.roleWorker;

  return (
    <section className={`flex flex-col gap-3 ${className ?? ""}`} style={style}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title} ({workers.length})
      </h2>

      {workers.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
            {t.nobodyHere}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.colName}</TableHead>
                      <TableHead>{t.colEmail}</TableHead>
                      <TableHead className="text-right">{t.colJobs}</TableHead>
                      <TableHead>{t.colLastActive}</TableHead>
                      <TableHead>{t.colStatus}</TableHead>
                      <TableHead className="text-right">{t.colActions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((w) => (
                      <TableRow
                        key={w.id}
                        onClick={() => setPeek(w)}
                        className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                      >
                        <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                          {w.name}
                        </TableCell>
                        <TableCell className="text-neutral-500 dark:text-neutral-400">{w.email}</TableCell>
                        <TableCell className="text-right tabular-nums">{w.jobs}</TableCell>
                        <TableCell className="text-neutral-500 dark:text-neutral-400">
                          {w.lastActive ? fmt(w.lastActive) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={w.active ? "success" : "destructive"}>
                            {w.active ? t.statusActive : t.statusInactive}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/admin/workers/${w.id}`}>
                              <Settings className="h-4 w-4" />
                              {t.manage}
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

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {workers.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setPeek(w)}
                className="w-full rounded-xl border border-neutral-200 bg-white text-left transition-colors active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:active:bg-neutral-800/60"
              >
                <div className="flex items-start gap-3 p-4">
                  <AvatarInitials name={w.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                        {w.name}
                      </span>
                      <Badge variant={w.active ? "success" : "destructive"}>
                        {w.active ? t.statusActive : t.statusInactive}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{w.email}</span>
                    </div>
                    <div className="mt-0.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                      {(w.jobs === 1 ? t.jobCountOne : t.jobCountMany).replace("{n}", String(w.jobs))}
                      {w.lastActive ? ` · ${t.lastActivePrefix.replace("{date}", fmt(w.lastActive))}` : ""}
                    </div>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Quick peek */}
      <BottomSheet open={peek !== null} onClose={() => setPeek(null)} title={peek?.name ?? ""} closeLabel={tc.close}>
        {peek && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              {peek.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={peek.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
              ) : (
                <AvatarInitials name={peek.name || peek.email} className="h-12 w-12 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={peek.role === "ADMIN" ? "default" : "secondary"}>{roleLabel(peek.role)}</Badge>
                  <Badge variant={peek.active ? "success" : "destructive"}>
                    {peek.active ? t.statusActive : t.statusInactive}
                  </Badge>
                </div>
                <a
                  href={`mailto:${peek.email}`}
                  className="mt-1.5 flex w-fit items-center gap-1.5 text-sm text-neutral-500 hover:text-primary dark:text-neutral-400"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {peek.email}
                </a>
                <span className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  {t.joined.replace("{date}", fmt(peek.createdAt))}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <ClipboardList className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <div>
                  <div className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {peek.jobs}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {t.recordsSubmitted}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <CalendarDays className="h-5 w-5 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {peek.lastActive ? fmt(peek.lastActive) : "—"}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {t.colLastActive}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <Wrench className="h-3.5 w-3.5" />
                {t.skills}
              </div>
              {peek.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {peek.skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.noSkills}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              {peek.jobs > 0 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/records?workerId=${peek.id}`}>
                    <ClipboardList className="h-4 w-4" />
                    {t.viewRecords}
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" className="ml-auto">
                <Link href={`/admin/workers/${peek.id}`}>
                  <Settings className="h-4 w-4" />
                  {t.manage}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </section>
  );
}
