import { requirePermission } from "@/lib/authz";
import { requireOrgId } from "@/lib/orgScope";
import { addUtcDays, getScheduledJobs, startOfUtcDay } from "@/lib/schedule";
import { buildCalendar } from "@/lib/ics";

// The whole company's agenda as a downloadable .ics feed (admin only), with an
// optional ?worker=<id> filter that matches the calendar's worker filter.
export async function GET(request: Request) {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);

  const worker = new URL(request.url).searchParams.get("worker")?.trim() || undefined;

  const today = startOfUtcDay(new Date());
  const jobs = await getScheduledJobs({
    session,
    organizationId,
    from: addUtcDays(today, -30),
    to: addUtcDays(today, 180),
    assignedToId: worker,
  });

  const ics = buildCalendar(jobs, { name: "AeroTrack · Schedule" });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="schedule.ics"',
    },
  });
}
