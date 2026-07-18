import type { ScheduledJobStatus } from "@prisma/client";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { toMinutes } from "@/lib/schedule";

// The minimum a job needs to appear on the timeline. Both the admin's
// ScheduleJobView and the worker's own job rows satisfy this, so the same
// timeline serves both sides.
export interface TimelineJob {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  status: ScheduledJobStatus;
  assignedToName?: string | null;
}

// Height of one hour row in the timeline. Kept in one place so the gutter
// labels, gridlines and block positions all agree.
const HOUR_PX = 56;
// A timed job never renders shorter than this, so a 15-minute (or point) visit
// still shows its title.
const MIN_BLOCK_PX = 28;

type Slot = { job: TimelineJob; start: number; end: number };
type Placed = Slot & { lane: number; lanes: number };

// Lay the day's timed jobs out into non-overlapping lanes. Overlapping jobs
// share a "cluster" and split the width between them (like a calendar day
// view); independent jobs each get the full width.
function place(slots: Slot[]): Placed[] {
  const sorted = [...slots].sort((a, b) => a.start - b.start || a.end - b.end);
  const placed: Placed[] = [];
  let cluster: Slot[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const withLane = cluster.map((s) => {
      let lane = laneEnds.findIndex((e) => e <= s.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(s.end);
      } else {
        laneEnds[lane] = s.end;
      }
      return { ...s, lane };
    });
    const lanes = laneEnds.length;
    for (const w of withLane) placed.push({ ...w, lanes });
    cluster = [];
    clusterEnd = -1;
  };

  for (const s of sorted) {
    if (cluster.length > 0 && s.start < clusterEnd) {
      cluster.push(s);
      clusterEnd = Math.max(clusterEnd, s.end);
    } else {
      flush();
      cluster = [s];
      clusterEnd = s.end;
    }
  }
  flush();
  return placed;
}

// A single-day timeline: an hour gutter with the day's timed jobs positioned by
// their start/end. Each block anchors to the matching job card below (#job-<id>)
// so tapping it jumps to the full card with all its actions. Untimed jobs have
// no place on a clock, so they're left to the list below; this returns null
// when there's nothing timed to show. Purely presentational (server-rendered).
export function ScheduleDayTimeline({
  jobs,
  conflictIds,
  conflictLabel,
  use24 = false,
}: {
  jobs: TimelineJob[];
  conflictIds: Set<string>;
  conflictLabel: string;
  // The org's 12/24-hour preference (Settings → Localization). Keeps the axis
  // ruler and each block's start time in the same format as the rest of the app.
  use24?: boolean;
}) {
  // Compact hour label for the ~40px gutter: "07"/"14" in 24-hour, "7a"/"2p" in
  // 12-hour (a full "2:00 PM" would overflow the ruler).
  const hourLabel = (h: number) =>
    use24 ? String(h).padStart(2, "0") : `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
  const slots: Slot[] = [];
  for (const job of jobs) {
    if (job.status === "CANCELED") continue;
    const start = toMinutes(job.startTime);
    if (start == null) continue;
    const rawEnd = toMinutes(job.endTime);
    const end = rawEnd != null && rawEnd > start ? rawEnd : start + 30;
    slots.push({ job, start, end });
  }
  if (slots.length === 0) return null;

  const minStart = Math.min(...slots.map((s) => s.start));
  const maxEnd = Math.max(...slots.map((s) => s.end));
  const startHour = Math.min(7, Math.floor(minStart / 60));
  const endHour = Math.max(18, Math.ceil(maxEnd / 60));
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const trackHeight = (endHour - startHour) * HOUR_PX;
  const placed = place(slots);

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
      <div className="flex">
        {/* Hour gutter */}
        <div className="relative w-10 shrink-0" style={{ height: trackHeight }}>
          {hours.map((h) => (
            <span
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400"
              style={{ top: (h - startHour) * HOUR_PX }}
            >
              {hourLabel(h)}
            </span>
          ))}
        </div>

        {/* Track */}
        <div className="relative flex-1" style={{ height: trackHeight }}>
          {/* Hour gridlines */}
          {hours.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 border-t border-neutral-100 dark:border-neutral-800/70"
              style={{ top: (h - startHour) * HOUR_PX }}
            />
          ))}

          {/* Job blocks */}
          {placed.map((p) => {
            const top = ((p.start - startHour * 60) / 60) * HOUR_PX;
            const height = Math.max(
              MIN_BLOCK_PX,
              ((p.end - p.start) / 60) * HOUR_PX - 2
            );
            const widthPct = 100 / p.lanes;
            const leftPct = p.lane * widthPct;
            const conflict = conflictIds.has(p.job.id);
            const done = p.job.status === "DONE";
            const inProgress = p.job.status === "IN_PROGRESS";
            return (
              <a
                key={p.job.id}
                href={`#job-${p.job.id}`}
                title={p.job.title}
                className={cn(
                  "absolute flex flex-col gap-0.5 overflow-hidden rounded-md border px-1.5 py-1 text-left transition-colors",
                  "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800",
                  conflict
                    ? "border-amber-300 ring-1 ring-amber-300 dark:border-amber-500/40 dark:ring-amber-500/40"
                    : inProgress
                      ? "border-primary/50 ring-1 ring-primary/40"
                      : "border-neutral-200 dark:border-neutral-800",
                  done && "opacity-60"
                )}
                style={{
                  top,
                  height,
                  left: `calc(${leftPct}% + ${p.lane === 0 ? 0 : 2}px)`,
                  width: `calc(${widthPct}% - ${p.lanes > 1 ? 3 : 0}px)`,
                }}
              >
                <span className="flex items-center gap-1 text-[10px] font-medium tabular-nums leading-none text-neutral-500 dark:text-neutral-400">
                  {conflict && <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-label={conflictLabel} />}
                  {p.job.startTime ? formatTime(p.job.startTime, use24) : ""}
                </span>
                <span
                  className={cn(
                    "truncate text-xs font-semibold leading-tight",
                    done
                      ? "text-neutral-400 line-through dark:text-neutral-500"
                      : "text-neutral-900 dark:text-neutral-100"
                  )}
                >
                  {p.job.title}
                </span>
                {height > MIN_BLOCK_PX + 14 && p.job.assignedToName && (
                  <span className="truncate text-[10px] leading-none text-neutral-500 dark:text-neutral-400">
                    {p.job.assignedToName}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
