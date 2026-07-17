"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  Image as ImageIcon,
  Inbox,
  Undo2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { StatTile } from "@/components/ui/stat-tile";
import { Textarea } from "@/components/ui/textarea";
import { ApproveRecordButton } from "@/components/records/ApproveRecordButton";
import { ReturnRecordButton } from "@/components/records/ReturnRecordButton";
import {
  bulkApproveRecordsAction,
  bulkRequestChangesAction,
} from "@/actions/records";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface QueueRecord {
  id: string;
  jobNumber: string;
  customerName: string;
  typeOfWork: string;
  at: string; // ISO — submitted time (queue) or returned time (returned list)
  submittedById: string | null;
  submittedByName: string | null;
  // First few photos + total, for the card preview (optional).
  thumbs?: string[];
  photoCount?: number;
}

function daysWaiting(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

type Bucket = "overdue" | "week" | "today";
function bucketOf(days: number): Bucket {
  if (days >= 3) return "overdue";
  if (days >= 1) return "week";
  return "today";
}

export function ReviewQueue({
  submitted,
  returned,
}: {
  submitted: QueueRecord[];
  returned: QueueRecord[];
}) {
  const t = useT().reviewQueue;
  const ta = useT().adminRecords;
  const tc = useT().common;
  const tr = useT().records;
  const locale = useLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
  });

  const [worker, setWorker] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState<"oldest" | "newest">("oldest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkReturn, setBulkReturn] = useState(false);
  const [bulkNote, setBulkNote] = useState("");
  const [peek, setPeek] = useState<QueueRecord | null>(null);
  const [pending, startTransition] = useTransition();

  // Filter options from the pending records.
  const workers = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of submitted) if (r.submittedById) m.set(r.submittedById, r.submittedByName ?? r.submittedById);
    return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [submitted]);
  const types = useMemo(
    () => [...new Set(submitted.map((r) => r.typeOfWork).filter(Boolean))].sort(),
    [submitted]
  );

  const shown = useMemo(() => {
    const filtered = submitted.filter(
      (r) => (!worker || r.submittedById === worker) && (!type || r.typeOfWork === type)
    );
    filtered.sort((a, b) => {
      const d = new Date(a.at).getTime() - new Date(b.at).getTime();
      return sort === "oldest" ? d : -d;
    });
    return filtered;
  }, [submitted, worker, type, sort]);

  // Bucket the shown records by age, most-urgent group first.
  const groups = useMemo(() => {
    const order: Bucket[] = ["overdue", "week", "today"];
    const byBucket: Record<Bucket, QueueRecord[]> = { overdue: [], week: [], today: [] };
    for (const r of shown) byBucket[bucketOf(daysWaiting(r.at))].push(r);
    return order
      .map((b) => ({ bucket: b, items: byBucket[b] }))
      .filter((g) => g.items.length > 0);
  }, [shown]);

  const bucketLabel: Record<Bucket, string> = {
    overdue: t.bucketOverdue,
    week: t.bucketWeek,
    today: t.bucketToday,
  };

  // KPIs
  const pendingCount = submitted.length;
  const waits = submitted.map((r) => daysWaiting(r.at));
  const avgWait = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;
  const oldestWait = waits.length ? Math.max(...waits) : 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelected(new Set());
  }
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));

  function approveSelected() {
    const ids = [...selected];
    startTransition(async () => {
      await bulkApproveRecordsAction(ids);
      clearSelection();
    });
  }
  function returnSelected() {
    const ids = [...selected];
    const note = bulkNote.trim();
    if (!note) return;
    startTransition(async () => {
      await bulkRequestChangesAction(ids, note);
      setBulkReturn(false);
      setBulkNote("");
      clearSelection();
    });
  }

  if (pendingCount === 0 && returned.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState icon={Inbox} title={t.empty} description={t.emptyDesc} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile center label={t.kpiPending} value={pendingCount} />
        <StatTile center label={t.kpiAvgWait} value={t.days.replace("{n}", String(avgWait))} />
        <StatTile center label={t.kpiOldest} value={t.days.replace("{n}", String(oldestWait))} />
        <StatTile center label={t.kpiReturned} value={returned.length} />
      </div>

      {/* Filters + sort */}
      {pendingCount > 0 && (workers.length > 1 || types.length > 1) && (
        <div className="flex flex-wrap items-center gap-2">
          {workers.length > 1 && (
            <Select
              aria-label={t.filterWorker}
              value={worker}
              onChange={(e) => setWorker(e.target.value)}
              className="sm:max-w-52"
            >
              <option value="">{t.allWorkers}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          )}
          {types.length > 1 && (
            <Select
              aria-label={t.filterType}
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="sm:max-w-52"
            >
              <option value="">{t.allTypes}</option>
              {types.map((ty) => (
                <option key={ty} value={ty}>
                  {ty}
                </option>
              ))}
            </Select>
          )}
          <Select
            aria-label={t.sort}
            value={sort}
            onChange={(e) => setSort(e.target.value as "oldest" | "newest")}
            className="sm:max-w-44"
          >
            <option value="oldest">{t.sortOldest}</option>
            <option value="newest">{t.sortNewest}</option>
          </Select>
          {shown.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setSelected(allShownSelected ? new Set() : new Set(shown.map((r) => r.id)))
              }
            >
              {allShownSelected ? t.clearSelection : t.selectAll}
            </Button>
          )}
        </div>
      )}

      {/* Queue, grouped by age */}
      {pendingCount === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.emptyDesc}</p>
      ) : (
        groups.map((group) => (
          <section key={group.bucket} className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {bucketLabel[group.bucket]}
              <span className="ml-1.5 font-normal tabular-nums text-neutral-400 dark:text-neutral-500">
                {group.items.length}
              </span>
            </p>
            {group.items.map((r) => (
              <QueueCard
                key={r.id}
                r={r}
                selected={selected.has(r.id)}
                onToggle={() => toggle(r.id)}
                onPeek={() => setPeek(r)}
                dateFmt={dateFmt}
                jobPrefix={tr.jobNumber}
                t={t}
              />
            ))}
          </section>
        ))
      )}

      {/* Returned — awaiting fixes */}
      {returned.length > 0 && (
        <section className="flex flex-col gap-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.returnedTitle}
            <span className="ml-1.5 font-normal tabular-nums text-neutral-400 dark:text-neutral-500">
              {returned.length}
            </span>
          </p>
          {returned.map((r) => {
            const days = daysWaiting(r.at);
            const ago =
              days <= 0
                ? t.returnedToday
                : (days === 1 ? t.returnedAgoOne : t.returnedAgoMany).replace("{n}", String(days));
            return (
              <Card key={r.id} className="animate-fade-up">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                        {tr.jobNumber}
                        {r.jobNumber}
                      </span>
                      <Badge variant="secondary">{ago}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {r.customerName} · {r.typeOfWork}
                      {r.submittedByName ? ` · ${t.submittedBy.replace("{name}", r.submittedByName)}` : ""}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link href={`/admin/records/${r.id}`}>
                      {t.review}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-4 sm:bottom-6 sm:pl-60">
          <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-2 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-lg shadow-black/10 backdrop-blur animate-fade-up dark:border-neutral-800 dark:bg-neutral-900/95">
            <button
              type="button"
              onClick={clearSelection}
              aria-label={t.clearSelection}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
              {ta.pendingSelected.replace("{n}", String(selected.size))}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setBulkReturn(true)}>
                <Undo2 className="h-4 w-4" />
                {ta.return}
              </Button>
              <ConfirmDialog
                title={(selected.size === 1 ? ta.bulkApproveTitleOne : ta.bulkApproveTitleMany).replace(
                  "{n}",
                  String(selected.size)
                )}
                description={ta.bulkApproveDesc}
                confirmLabel={ta.approve}
                confirmVariant="default"
                onConfirm={approveSelected}
                trigger={
                  <Button type="button" size="sm" disabled={pending}>
                    <Check className="h-4 w-4" />
                    {ta.approve}
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}

      <BottomSheet
        open={bulkReturn}
        onClose={() => setBulkReturn(false)}
        title={(selected.size === 1 ? ta.bulkReturnTitleOne : ta.bulkReturnTitleMany).replace(
          "{n}",
          String(selected.size)
        )}
        closeLabel={tc.close}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{ta.bulkReturnDesc}</p>
          <Textarea
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={ta.bulkReturnPlaceholder}
          />
          <Button
            type="button"
            variant="destructive"
            onClick={returnSelected}
            disabled={pending || !bulkNote.trim()}
            className="w-full"
          >
            <Undo2 className="h-4 w-4" />
            {ta.returnN.replace("{n}", String(selected.size))}
          </Button>
        </div>
      </BottomSheet>

      {/* Quick peek — a read-only glance at the record without leaving the
          queue: its details, all thumbnails, and the same one-tap actions. */}
      <BottomSheet
        open={peek !== null}
        onClose={() => setPeek(null)}
        title={peek ? `${tr.jobNumber}${peek.jobNumber}` : ""}
        closeLabel={tc.close}
      >
        {peek && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const days = daysWaiting(peek.at);
                const waitLabel =
                  days <= 0
                    ? t.today
                    : (days === 1 ? t.waitingOne : t.waitingMany).replace("{n}", String(days));
                const tone = days >= 3 ? "destructive" : days >= 1 ? "warning" : "secondary";
                return <Badge variant={tone}>{waitLabel}</Badge>;
              })()}
              {peek.submittedByName && (
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t.submittedBy.replace("{name}", peek.submittedByName)}
                </span>
              )}
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  {tr.customer}
                </dt>
                <dd className="text-neutral-900 dark:text-neutral-100">{peek.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  {tr.typeOfWork}
                </dt>
                <dd className="text-neutral-900 dark:text-neutral-100">{peek.typeOfWork}</dd>
              </div>
            </dl>

            {peek.thumbs && peek.thumbs.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {peek.thumbs.map((src, i) => (
                  <span
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {i === peek.thumbs!.length - 1 &&
                      (peek.photoCount ?? 0) > peek.thumbs!.length && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                          +{(peek.photoCount ?? 0) - peek.thumbs!.length}
                        </span>
                      )}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <ApproveRecordButton recordId={peek.id} />
              <ReturnRecordButton recordId={peek.id} />
              <Button asChild variant="ghost" size="sm" className="ml-auto">
                <Link href={`/admin/records/${peek.id}`}>
                  {t.review}
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

function QueueCard({
  r,
  selected,
  onToggle,
  onPeek,
  dateFmt,
  jobPrefix,
  t,
}: {
  r: QueueRecord;
  selected: boolean;
  onToggle: () => void;
  onPeek: () => void;
  dateFmt: Intl.DateTimeFormat;
  jobPrefix: string;
  t: ReturnType<typeof useT>["reviewQueue"];
}) {
  const days = daysWaiting(r.at);
  const waitLabel =
    days <= 0 ? t.today : (days === 1 ? t.waitingOne : t.waitingMany).replace("{n}", String(days));
  const tone = days >= 3 ? "destructive" : days >= 1 ? "warning" : "secondary";

  return (
    <Card className={cn("animate-fade-up", selected && "ring-2 ring-primary")}>
      <CardContent className="flex items-start gap-3 p-4">
        <label className="mt-0.5 flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-accent dark:border-neutral-600"
            aria-label={t.selectRecord.replace("{n}", String(r.jobNumber))}
          />
        </label>

        {r.thumbs && r.thumbs.length > 0 && (
          <div className="flex shrink-0 gap-1">
            {r.thumbs.slice(0, 3).map((src, i) => (
              <span
                key={i}
                className="relative h-12 w-12 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                {i === 2 && (r.photoCount ?? 0) > 3 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-semibold text-white">
                    +{(r.photoCount ?? 0) - 3}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {jobPrefix}
              {r.jobNumber}
            </span>
            <Badge variant={tone}>{waitLabel}</Badge>
            {(r.photoCount ?? 0) > 0 && (!r.thumbs || r.thumbs.length === 0) && (
              <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                <ImageIcon className="h-3 w-3" />
                {r.photoCount}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
            {r.customerName} · {r.typeOfWork} · {dateFmt.format(new Date(r.at))}
            {r.submittedByName ? ` · ${t.submittedBy.replace("{name}", r.submittedByName)}` : ""}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ApproveRecordButton recordId={r.id} />
            <ReturnRecordButton recordId={r.id} />
            <Button type="button" variant="ghost" size="sm" onClick={onPeek}>
              <Eye className="h-4 w-4" />
              {t.peek}
            </Button>
            <Button asChild variant="ghost" size="sm" className="ml-auto">
              <Link href={`/admin/records/${r.id}`}>
                {t.review}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
