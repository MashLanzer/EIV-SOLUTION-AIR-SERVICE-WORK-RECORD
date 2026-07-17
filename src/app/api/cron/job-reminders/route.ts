import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { appUrl, emailLayout, sendEmail } from "@/lib/email";
import { createNotifications } from "@/lib/inappNotify";
import { toMinutes } from "@/lib/schedule";
import { zonedWallTimeToUtc } from "@/lib/timezone";

// Pre-job reminders. Runs hourly (see vercel.json) and, for each timed job,
// emails + notifies the assigned worker once its start comes within the org's
// configured lead time (Settings → Scheduling, default 24h). reminderSentAt is
// stamped first so a job is reminded at most once even if a send retries or the
// cron overlaps. Times are treated as UTC, consistent with the rest of the app
// (the schedule has no per-org timezone). Best-effort per job.
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// The largest lead window we support (matches the 168h cap in Settings), used
// only to bound the candidate query so we never scan the whole table.
const MAX_LEAD_HOURS = 168;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Candidate window: any not-yet-reminded, timed, assigned job whose day falls
  // between yesterday (to cover early-UTC starts) and the far edge of the lead
  // window. Per-job due-ness is decided precisely below.
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + (MAX_LEAD_HOURS + 24) * 60 * 60 * 1000);

  const jobs = await prisma.scheduledJob.findMany({
    where: {
      reminderSentAt: null,
      startTime: { not: null },
      status: { notIn: ["CANCELED", "DONE"] },
      assignedToId: { not: null },
      assignedTo: { active: true },
      scheduledFor: { gte: windowStart, lte: windowEnd },
    },
    select: {
      id: true,
      title: true,
      scheduledFor: true,
      startTime: true,
      endTime: true,
      organizationId: true,
      assignedToId: true,
      assignedTo: { select: { email: true } },
      customer: { select: { name: true } },
      project: { select: { name: true } },
      organization: { select: { reminderLeadHours: true, notifyReminders: true, timeZone: true } },
    },
  });

  let sent = 0;
  for (const job of jobs) {
    // Respect the company's reminders switch (Settings → Notifications).
    if (!job.organization?.notifyReminders) continue;
    const startMin = toMinutes(job.startTime);
    if (startMin == null || !job.assignedToId) continue;

    // Absolute job start = its calendar day + wall-clock start, interpreted in
    // the org's time zone so the reminder fires at the right real-world moment.
    const jobStart = zonedWallTimeToUtc(
      job.scheduledFor.getUTCFullYear(),
      job.scheduledFor.getUTCMonth() + 1,
      job.scheduledFor.getUTCDate(),
      Math.floor(startMin / 60),
      startMin % 60,
      job.organization.timeZone ?? "UTC"
    );
    const lead = job.organization.reminderLeadHours ?? 24;
    const leadEdge = new Date(now.getTime() + lead * 60 * 60 * 1000);
    // Due when the start is still ahead of us but within the lead window.
    if (!(jobStart > now && jobStart <= leadEdge)) continue;

    // Stamp first so a retry or an overlapping run can't double-send.
    try {
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { reminderSentAt: now },
      });
    } catch {
      continue;
    }

    const dateLabel = dateFmt.format(job.scheduledFor);
    const timeLabel = job.endTime ? `${job.startTime}–${job.endTime}` : job.startTime;
    const where = job.project?.name ?? job.customer?.name ?? "";
    const title = job.title || "Scheduled job";
    const email = job.assignedTo?.email;

    if (email) {
      await sendEmail({
        to: email,
        subject: `Reminder: ${title} — ${dateLabel}`,
        html: emailLayout(
          "You have an upcoming job",
          [
            `<strong>${title}</strong>`,
            `${dateLabel} · ${timeLabel}${where ? ` · ${where}` : ""}`,
          ],
          { href: appUrl("/records/schedule"), label: "Open your schedule" }
        ),
      });
    }

    await createNotifications({
      organizationId: job.organizationId,
      userIds: [job.assignedToId],
      category: "PERSONAL",
      type: "job_reminder",
      title: "Upcoming job reminder",
      body: `${title} · ${dateLabel} · ${timeLabel}${where ? ` · ${where}` : ""}`,
      href: "/records/schedule",
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, reminded: sent, candidates: jobs.length });
}
