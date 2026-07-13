import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { getProfileData } from "@/lib/profileData";
import { getLocale } from "@/lib/i18n/server";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";

export default async function WorkerProfilePage() {
  const session = await requireAuth();
  const data = await getProfileData(session.user.id, requireOrgId(session));
  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <ProfileScreen
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      phone={session.user.phone ?? null}
      storedSignature={session.user.storedSignature ?? null}
      role={session.user.role}
      backHref="/records"
      recordHrefBase="/records"
      scheduleHref="/records/schedule"
      avatarUrl={data.avatarUrl}
      metrics={data.metrics}
      stats={data.stats}
      teams={data.teams}
      recentRecords={data.recentRecords.map((r) => ({
        id: r.id,
        jobNumber: r.jobNumber,
        customerName: r.customerName,
        date: r.date.toISOString().slice(0, 10),
        status: r.status,
      }))}
      needsAttention={data.needsAttention.map((r) => ({
        id: r.id,
        jobNumber: r.jobNumber,
        customerName: r.customerName,
        date: r.date.toISOString().slice(0, 10),
        status: r.status,
      }))}
      upcomingJobs={data.upcomingJobs.map((j) => ({
        id: j.id,
        title: j.title,
        dateKey: j.scheduledFor.toISOString().slice(0, 10),
        dateLabel: dateFmt.format(j.scheduledFor),
        timeLabel: j.startTime && j.endTime ? `${j.startTime}–${j.endTime}` : j.startTime,
        subtitle: j.customer?.name ?? j.project?.name ?? null,
      }))}
      skillSuggestions={data.skillSuggestions}
      skills={data.skills}
    />
  );
}
