import { describe, expect, it } from "vitest";

import { buildCalendar } from "@/lib/ics";
import type { ScheduledJobRow } from "@/lib/schedule";

// A minimal ScheduledJobRow for the builder; only the fields ics.ts reads
// matter, so the rest is filled with harmless defaults.
function job(overrides: Partial<ScheduledJobRow>): ScheduledJobRow {
  return {
    id: "job1",
    organizationId: "org1",
    title: "Visit",
    notes: null,
    scheduledFor: new Date("2026-07-14T00:00:00.000Z"),
    startTime: null,
    endTime: null,
    status: "SCHEDULED",
    assignedToId: null,
    teamId: null,
    customerId: null,
    projectId: null,
    workRecordId: null,
    createdById: "u1",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    assignedTo: null,
    team: null,
    customer: null,
    project: null,
    workRecord: null,
    ...overrides,
  } as ScheduledJobRow;
}

describe("buildCalendar", () => {
  it("wraps events in a VCALENDAR with CRLF line breaks", () => {
    const ics = buildCalendar([], { name: "Test cal" });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("X-WR-CALNAME:Test cal");
  });

  it("writes a timed job as a local start/end", () => {
    const ics = buildCalendar([
      job({ id: "a", title: "Filter swap", startTime: "09:00", endTime: "10:30" }),
    ]);
    expect(ics).toContain("UID:a@aerotrack.app");
    expect(ics).toContain("DTSTART:20260714T090000");
    expect(ics).toContain("DTEND:20260714T103000");
    expect(ics).toContain("SUMMARY:Filter swap");
  });

  it("defaults a timed job with no end to a one-hour block", () => {
    const ics = buildCalendar([job({ startTime: "14:00" })]);
    expect(ics).toContain("DTSTART:20260714T140000");
    expect(ics).toContain("DTEND:20260714T150000");
  });

  it("writes an untimed job as an all-day event spanning to the next day", () => {
    const ics = buildCalendar([job({})]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260714");
    expect(ics).toContain("DTEND;VALUE=DATE:20260715");
  });

  it("escapes reserved characters in text values", () => {
    const ics = buildCalendar([job({ title: "A; B, C\nD" })]);
    expect(ics).toContain("SUMMARY:A\\; B\\, C\\nD");
  });

  it("marks canceled jobs as CANCELLED", () => {
    const ics = buildCalendar([job({ status: "CANCELED" })]);
    expect(ics).toContain("STATUS:CANCELLED");
  });
});
