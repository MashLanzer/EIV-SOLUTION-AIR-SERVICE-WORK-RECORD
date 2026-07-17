"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarPlus, GripVertical, UserRound } from "lucide-react";

import { ScheduleJobCard, type ScheduleJobView } from "@/components/schedule/ScheduleJobCard";
import type { JobOption } from "@/components/schedule/ScheduleJobForm";
import { reassignJobAction, rescheduleJobAction } from "@/actions/schedule";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export type BoardDay = {
  key: string;
  label: string;
  isToday: boolean;
  createHref: string;
  // Day view link for this day — compact week cards open it to manage the job.
  dayHref: string;
};

// Drag-and-drop week board: reschedule a job by dropping it on another day, or
// reassign it by dropping it on a worker chip. Falls back gracefully — the same
// moves are still available from each card's edit form. Uses native HTML5 DnD
// (no dependency) with a dedicated grip handle so inner buttons stay clickable.
export function WeekBoard({
  days,
  initialJobsByDay,
  workers,
  teams,
  customers,
  projects,
  conflictIds,
}: {
  days: BoardDay[];
  initialJobsByDay: Record<string, ScheduleJobView[]>;
  workers: JobOption[];
  teams: JobOption[];
  customers: JobOption[];
  projects: JobOption[];
  conflictIds: string[];
}) {
  const t = useT().schedule;
  const [jobsByDay, setJobsByDay] = useState(initialJobsByDay);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const conflicts = new Set(conflictIds);

  function findJob(id: string): { job: ScheduleJobView; day: string } | null {
    for (const [day, list] of Object.entries(jobsByDay)) {
      const job = list.find((j) => j.id === id);
      if (job) return { job, day };
    }
    return null;
  }

  function moveToDay(id: string, targetDay: string) {
    const found = findJob(id);
    if (!found || found.day === targetDay) return;
    setJobsByDay((prev) => {
      const next: Record<string, ScheduleJobView[]> = {};
      for (const [day, list] of Object.entries(prev)) {
        next[day] = list.filter((j) => j.id !== id);
      }
      next[targetDay] = [...(next[targetDay] ?? []), { ...found.job, scheduledFor: targetDay }];
      return next;
    });
    startTransition(() => rescheduleJobAction(id, targetDay));
  }

  function assignToWorker(id: string, workerId: string, workerName: string | null) {
    const found = findJob(id);
    if (!found || found.job.assignedToId === (workerId || null)) return;
    setJobsByDay((prev) => {
      const next: Record<string, ScheduleJobView[]> = {};
      for (const [day, list] of Object.entries(prev)) {
        next[day] = list.map((j) =>
          j.id === id ? { ...j, assignedToId: workerId || null, assignedToName: workerName } : j
        );
      }
      return next;
    });
    startTransition(() => reassignJobAction(id, workerId));
  }

  const hasAny = days.some((d) => (jobsByDay[d.key] ?? []).length > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Reassign strip: drop a job on a worker to reassign it. */}
      {hasAny && workers.length > 0 && (
        <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <UserRound className="h-3.5 w-3.5" />
            {t.reassignHint}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {workers.map((w) => (
              <DropChip
                key={w.id}
                active={draggingId != null}
                over={overKey === `w:${w.id}`}
                onEnter={() => setOverKey(`w:${w.id}`)}
                onLeave={() => setOverKey(null)}
                onDrop={(id) => {
                  assignToWorker(id, w.id, w.name);
                  setOverKey(null);
                }}
              >
                {w.name}
              </DropChip>
            ))}
            <DropChip
              active={draggingId != null}
              over={overKey === "w:"}
              onEnter={() => setOverKey("w:")}
              onLeave={() => setOverKey(null)}
              onDrop={(id) => {
                assignToWorker(id, "", null);
                setOverKey(null);
              }}
            >
              {t.unassignChip}
            </DropChip>
          </div>
        </div>
      )}

      {!hasAny ? null : (
        days.map((d) => {
          const dayJobs = jobsByDay[d.key] ?? [];
          const isOver = overKey === `d:${d.key}`;
          return (
            <section
              key={d.key}
              onDragOver={(e) => {
                if (draggingId) {
                  e.preventDefault();
                  setOverKey(`d:${d.key}`);
                }
              }}
              onDragLeave={(e) => {
                // Only clear when leaving the section, not its children.
                if (e.currentTarget === e.target) setOverKey(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || draggingId;
                if (id) moveToDay(id, d.key);
                setOverKey(null);
              }}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-2 transition-colors",
                isOver
                  ? "border-primary/60 bg-accent-soft"
                  : "border-transparent"
              )}
            >
              <div className="flex items-center gap-2 px-1">
                <h2
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wide",
                    d.isToday ? "text-primary" : "text-neutral-500 dark:text-neutral-400"
                  )}
                >
                  {d.label}
                </h2>
                {d.isToday && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-text">
                    {t.today}
                  </span>
                )}
                {dayJobs.length > 0 && (
                  <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                    {dayJobs.length}
                  </span>
                )}
              </div>

              {dayJobs.length === 0 ? (
                <Link
                  href={d.createHref}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-600 dark:text-neutral-500 dark:hover:border-neutral-700 dark:hover:text-neutral-300"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {t.scheduleForDay}
                </Link>
              ) : (
                dayJobs.map((job) => (
                  <div
                    key={job.id}
                    className={cn(
                      "flex items-stretch gap-1.5 rounded-lg transition-opacity",
                      draggingId === job.id && "opacity-40"
                    )}
                  >
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", job.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(job.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverKey(null);
                      }}
                      aria-label={t.dragHandle}
                      className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500 active:cursor-grabbing dark:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-400"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <ScheduleJobCard
                        job={job}
                        workers={workers}
                        teams={teams}
                        customers={customers}
                        projects={projects}
                        conflict={conflicts.has(job.id)}
                        compact
                        compactHref={d.dayHref}
                      />
                    </div>
                  </div>
                ))
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

// A worker (or "unassign") drop target chip. Highlights while a drag is in
// flight and brightens when hovered.
function DropChip({
  children,
  active,
  over,
  onEnter,
  onLeave,
  onDrop,
}: {
  children: React.ReactNode;
  active: boolean;
  over: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onDrop: (jobId: string) => void;
}) {
  return (
    <span
      onDragOver={(e) => {
        if (active) {
          e.preventDefault();
          onEnter();
        }
      }}
      onDragLeave={onLeave}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
      }}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        over
          ? "border-primary bg-primary text-primary-foreground"
          : active
            ? "border-primary/50 bg-accent-soft text-accent-text"
            : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
      )}
    >
      {children}
    </span>
  );
}
