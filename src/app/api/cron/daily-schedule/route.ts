import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { appUrl, emailLayout, sendEmail } from "@/lib/email";
import { addUtcDays, startOfUtcDay } from "@/lib/schedule";

// Daily "here's your schedule for today" email to each worker who has jobs.
// Triggered by Vercel Cron (see vercel.json), which sends
// `Authorization: Bearer <CRON_SECRET>`. Best-effort per worker.
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const from = startOfUtcDay(new Date());
  const to = addUtcDays(from, 1);

  const jobs = await prisma.scheduledJob.findMany({
    where: {
      scheduledFor: { gte: from, lt: to },
      status: { not: "CANCELED" },
      assignedToId: { not: null },
      assignedTo: { active: true },
    },
    orderBy: [{ startTime: "asc" }, { createdAt: "asc" }],
    select: {
      title: true,
      startTime: true,
      endTime: true,
      assignedToId: true,
      assignedTo: { select: { email: true } },
      customer: { select: { name: true } },
      project: { select: { name: true } },
    },
  });

  // Group by worker.
  const byWorker = new Map<string, { email: string; rows: string[] }>();
  for (const j of jobs) {
    const email = j.assignedTo?.email;
    if (!j.assignedToId || !email) continue;
    const time = j.startTime
      ? j.endTime
        ? `${j.startTime}–${j.endTime}`
        : j.startTime
      : "All day";
    const where = j.project?.name ?? j.customer?.name ?? "";
    const row = `${time} · ${j.title || "Scheduled job"}${where ? ` · ${where}` : ""}`;
    const entry = byWorker.get(j.assignedToId) ?? { email, rows: [] };
    entry.rows.push(row);
    byWorker.set(j.assignedToId, entry);
  }

  const today = dateFmt.format(from);
  let sent = 0;
  for (const { email, rows } of byWorker.values()) {
    await sendEmail({
      to: email,
      subject: `Your schedule for ${today} — ${rows.length} ${rows.length === 1 ? "job" : "jobs"}`,
      html: emailLayout(
        `Your schedule for ${today}`,
        rows.map((r) => `• ${r}`),
        { href: appUrl("/records/schedule"), label: "Open your schedule" }
      ),
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, workers: sent, jobs: jobs.length });
}
