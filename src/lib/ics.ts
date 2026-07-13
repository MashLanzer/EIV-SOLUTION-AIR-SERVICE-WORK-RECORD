// Build an iCalendar (.ics) feed from scheduled jobs so a worker (or admin) can
// subscribe to their agenda from any phone/desktop calendar app. Times are
// written as "floating" local wall-clock (no timezone), matching how the app
// treats startTime/endTime everywhere else - the crew reads the clock, not UTC.

import { toMinutes } from "@/lib/schedule";
import type { ScheduledJobRow } from "@/lib/schedule";

// Escape the reserved characters in an iCalendar TEXT value.
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

const pad = (n: number) => String(n).padStart(2, "0");

// A Date (UTC midnight DATE column) → "YYYYMMDD".
function dateStamp(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// Minutes since midnight → "HHMMSS".
function timeStamp(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, minutes));
  return `${pad(Math.floor(clamped / 60))}${pad(clamped % 60)}00`;
}

// A single VEVENT for one job. Untimed jobs become all-day events; timed ones
// get a start/end (defaulting to a 1-hour block when no end is set).
function toEvent(job: ScheduledJobRow, dtstamp: string, domain: string): string[] {
  const day = dateStamp(job.scheduledFor);
  const start = toMinutes(job.startTime);

  const lines: string[] = ["BEGIN:VEVENT", `UID:${job.id}@${domain}`, `DTSTAMP:${dtstamp}`];

  if (start == null) {
    // All-day: DTEND is the exclusive next day.
    const next = new Date(job.scheduledFor);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${dateStamp(next)}`);
  } else {
    const rawEnd = toMinutes(job.endTime);
    const end = rawEnd != null && rawEnd > start ? rawEnd : start + 60;
    lines.push(`DTSTART:${day}T${timeStamp(start)}`, `DTEND:${day}T${timeStamp(end)}`);
  }

  lines.push(`SUMMARY:${esc(job.title || "Job")}`);

  const location = job.project?.address || job.customer?.address || job.project?.name || job.customer?.name;
  if (location) lines.push(`LOCATION:${esc(location)}`);

  const descParts: string[] = [];
  if (job.assignedTo?.name) descParts.push(`Assigned: ${job.assignedTo.name}`);
  else if (job.team?.name) descParts.push(`Team: ${job.team.name}`);
  if (job.customer?.name) descParts.push(`Customer: ${job.customer.name}`);
  if (job.project?.name) descParts.push(`Project: ${job.project.name}`);
  if (job.notes) descParts.push(job.notes);
  if (descParts.length > 0) lines.push(`DESCRIPTION:${esc(descParts.join("\n"))}`);

  lines.push(`STATUS:${job.status === "CANCELED" ? "CANCELLED" : "CONFIRMED"}`);
  lines.push("END:VEVENT");
  return lines;
}

// Assemble a full VCALENDAR. `name` shows as the calendar's title in most apps.
export function buildCalendar(
  jobs: ScheduledJobRow[],
  opts: { name: string; domain?: string } = { name: "AeroTrack" }
): string {
  const domain = opts.domain ?? "aerotrack.app";
  const dtstamp = `${dateStamp(new Date())}T${timeStamp(
    new Date().getUTCHours() * 60 + new Date().getUTCMinutes()
  )}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AeroTrack//Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(opts.name)}`,
  ];
  for (const job of jobs) lines.push(...toEvent(job, dtstamp, domain));
  lines.push("END:VCALENDAR");

  // iCalendar requires CRLF line breaks.
  return lines.join("\r\n") + "\r\n";
}
