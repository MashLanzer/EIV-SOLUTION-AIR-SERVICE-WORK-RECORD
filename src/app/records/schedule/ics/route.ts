import { requireAuth } from "@/lib/session";
import { requireOrgId } from "@/lib/orgScope";
import { addUtcDays, getScheduledJobs, startOfUtcDay } from "@/lib/schedule";
import { buildCalendar } from "@/lib/ics";

// The signed-in worker's own agenda as a downloadable .ics feed, scoped by the
// same role rules as the on-screen calendar. Covers a wide window (recent past
// through the next ~6 months) so a calendar subscription stays useful.
export async function GET() {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const today = startOfUtcDay(new Date());
  const jobs = await getScheduledJobs({
    session,
    organizationId,
    from: addUtcDays(today, -30),
    to: addUtcDays(today, 180),
  });

  const ics = buildCalendar(jobs, { name: "AeroTrack · My schedule" });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-schedule.ics"',
    },
  });
}
