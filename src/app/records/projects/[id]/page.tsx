import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock,
  FilePlus2,
  MapPin,
  Navigation,
  User,
  Users2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import { ProjectChecklists } from "@/components/projects/ProjectChecklists";
import { ProjectSummarySheet } from "@/components/projects/ProjectSummarySheet";
import { ProjectPhotos } from "@/components/projects/ProjectPhotos";
import { GeoPhotoMap } from "@/components/projects/GeoPhotoMap";
import { WeatherCard } from "@/components/projects/WeatherCard";
import { GeocodeNotice } from "@/components/projects/GeocodeNotice";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { StatusBadge } from "@/components/records/StatusBadge";
import { prisma } from "@/lib/prisma";
import { getWeather } from "@/lib/weather";
import { formatTimeRange } from "@/lib/format";
import { requireOrgId } from "@/lib/orgScope";
import { canAccessProject } from "@/lib/projectAccess";
import { dayKey, startOfUtcDay } from "@/lib/schedule";
import { requireAuth } from "@/lib/session";
import { getT, getLocale } from "@/lib/i18n/server";

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatSince(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function WorkerProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const { id } = await params;
  const isAdmin = session.user.role === "ADMIN";
  const dict = await getT();
  const tp = dict.projects;
  const tr = dict.records;
  const locale = await getLocale();

  if (!(await canAccessProject(session, id))) notFound();

  const project = await prisma.project.findFirst({
    where: { id, organizationId },
    include: {
      team: { select: { name: true } },
      customer: { select: { name: true } },
      _count: { select: { photos: true } },
    },
  });
  if (!project) notFound();

  const located = project.latitude != null && project.longitude != null;
  const weather = located
    ? await getWeather(project.latitude as number, project.longitude as number)
    : null;

  const [records, photoRows, checklists, statusCounts, nextJob, org] = await Promise.all([
    prisma.workRecord.findMany({
      where: { organizationId, projectId: id },
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        date: true,
        jobNumber: true,
        status: true,
        typeOfWork: true,
        submittedById: true,
        submittedBy: { select: { name: true } },
      },
    }),
    prisma.photo.findMany({
      where: { organizationId, projectId: id },
      orderBy: { takenAt: "desc" },
      take: 60,
      select: {
        id: true,
        url: true,
        takenAt: true,
        latitude: true,
        longitude: true,
        takenById: true,
        takenBy: { select: { name: true } },
        _count: { select: { photoTags: true, comments: true } },
      },
    }),
    prisma.checklist.findMany({
      where: { organizationId, projectId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        items: {
          orderBy: { position: "asc" },
          select: { id: true, text: true, done: true },
        },
      },
    }),
    // Full record-status breakdown for the project summary sheet (independent of
    // the 50-row list above, so the counts are exact).
    prisma.workRecord.groupBy({
      by: ["status"],
      where: { organizationId, projectId: id },
      _count: { _all: true },
    }),
    // The next scheduled visit to this jobsite, so the project links to the
    // calendar (workers see where this project is headed next).
    prisma.scheduledJob.findFirst({
      where: {
        organizationId,
        projectId: id,
        status: { not: "CANCELED" },
        scheduledFor: { gte: startOfUtcDay(new Date()) },
      },
      orderBy: [{ scheduledFor: "asc" }, { startTime: "asc" }],
      select: {
        scheduledFor: true,
        startTime: true,
        endTime: true,
        title: true,
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timeFormat: true },
    }),
  ]);
  const use24 = org?.timeFormat === "24";

  // Records-by-status for the summary sheet.
  const statusCount = (s: string) =>
    statusCounts.find((c) => c.status === s)?._count._all ?? 0;
  const summaryStatus = {
    approved: statusCount("APPROVED"),
    pending: statusCount("SUBMITTED"),
    needsChanges: statusCount("NEEDS_CHANGES"),
    total: statusCounts.reduce((sum, c) => sum + c._count._all, 0),
  };
  // Checklist completion across every list on the project.
  const checklistItems = checklists.flatMap((c) => c.items);
  const checklistDone = checklistItems.filter((i) => i.done).length;
  const summaryChecklist =
    checklistItems.length > 0
      ? {
          done: checklistDone,
          total: checklistItems.length,
          pct: Math.round((checklistDone / checklistItems.length) * 100),
        }
      : null;
  // The project's most recent records, each a shortcut into that record.
  const summaryRecent = records.slice(0, 5).map((r) => ({
    id: r.id,
    jobNumber: r.jobNumber,
    dateLabel: formatDate(r.date, locale),
    typeOfWork: r.typeOfWork,
    status: r.status,
  }));

  const photos = photoRows.map((p) => ({
    id: p.id,
    url: p.url,
    takenAt: p.takenAt.toISOString(),
    takenByName: p.takenBy?.name ?? null,
    takenById: p.takenById,
    hasGps: p.latitude != null,
    tagCount: p._count.photoTags,
    commentCount: p._count.comments,
  }));

  const projectPins = located
    ? [
        {
          id: project.id,
          name: project.name,
          latitude: project.latitude as number,
          longitude: project.longitude as number,
          kind: "project" as const,
        },
      ]
    : [];
  const photoPins = photoRows
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      name: dict.photos.photoPinLabel,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      kind: "photo" as const,
      thumbnail: p.url,
      subtitle: `${p.takenBy?.name ? `${p.takenBy.name} · ` : ""}${formatSince(p.takenAt, locale)}`,
      href: `/records/projects/${project.id}/photos/${p.id}`,
    }));
  const hasMap = projectPins.length > 0 || photoPins.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/records/projects"
        className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        {tp.title}
      </Link>

      {/* Header - read-only project identity */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {project.name}
            </h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {project.customer && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 shrink-0" />
                {project.customer.name}
              </span>
            )}
            {project.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {project.address}
              </span>
            )}
            {project.team && (
              <span className="flex items-center gap-1.5">
                <Users2 className="h-4 w-4 shrink-0" />
                {project.team.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" />
              {tp.created.replace("{date}", formatSince(project.createdAt, locale))}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* At-a-glance KPIs for this jobsite. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile center label={tp.workRecords} value={String(summaryStatus.total)} />
        <StatTile center label={tr.approved} value={String(summaryStatus.approved)} tone="success" />
        <StatTile
          center
          label={tp.checklist}
          value={summaryChecklist ? `${summaryChecklist.pct}%` : "—"}
          sub={summaryChecklist ? `${summaryChecklist.done}/${summaryChecklist.total}` : undefined}
        />
        <StatTile center label={tp.tabPhotos} value={String(project._count.photos)} />
      </div>

      {/* Next scheduled visit to this jobsite — links straight into the day. */}
      {nextJob && (
        <Card className="border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
          <CardContent className="flex flex-col gap-2 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {tp.nextVisit}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
              <span>{formatDate(nextJob.scheduledFor, locale)}</span>
              <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatTimeRange(nextJob.startTime, nextJob.endTime, use24, dict.schedule.allDay)}
              </span>
            </div>
            {(nextJob.title || nextJob.assignedTo?.name) && (
              <p className="truncate text-sm text-neutral-600 dark:text-neutral-300">
                {[nextJob.title, nextJob.assignedTo?.name].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="pt-0.5">
              <Button asChild size="sm" variant="outline">
                <Link href={`/records/schedule?date=${dayKey(nextJob.scheduledFor)}&day=1`}>
                  {dict.schedule.viewDay}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions: navigate to the jobsite, or start a record already
          tagged to this project. */}
      <div className="flex flex-wrap gap-2">
        {project.address && (
          <Button asChild variant="outline" size="sm">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(project.address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation className="h-4 w-4" aria-hidden="true" />
              {tp.directions}
            </a>
          </Button>
        )}
        <Button asChild size="sm">
          <Link href={`/records/new?projectId=${project.id}`}>
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            {tp.startRecordHere}
          </Link>
        </Button>
      </div>

      {/* At-a-glance summary: records by status, checklist progress, and recent
          records (each a shortcut into the record) — the admin project sheet. */}
      <ProjectSummarySheet
        status={summaryStatus}
        checklist={summaryChecklist}
        createdLabel={tp.created.replace("{date}", formatSince(project.createdAt, locale))}
        recent={summaryRecent}
        recordHrefBase="/records/"
      />

      {hasMap && (
        <>
          <GeoPhotoMap projectPins={projectPins} photoPins={photoPins} showAllOption={false} />
          {located && weather && <WeatherCard weather={weather} />}
        </>
      )}
      {!located && project.address && (
        <GeocodeNotice projectId={project.id} address={project.address} canRetry={false} />
      )}

      {/* Checklists - workers can only check items off */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {tp.tabChecklists}
        </h2>
        <ProjectChecklists
          projectId={project.id}
          checklists={checklists}
          templates={[]}
          canManage={isAdmin}
        />
      </section>

      {/* Photos - upload; delete only your own */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {tp.tabPhotos}
        </h2>
        <ProjectPhotos
          projectId={project.id}
          initialPhotos={photos}
          currentUserId={session.user.id}
          canDeleteAny={isAdmin}
          basePath="/records/projects"
        />
      </section>

      {/* Work records on this project */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {tp.workRecords} ({records.length})
        </h2>
        {records.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={ClipboardList}
                title={tp.noWorkRecords}
                description={tp.noWorkRecordsDesc}
              />
            </CardContent>
          </Card>
        ) : (
          <MobileCardList>
            {records.map((record) => {
              const canOpen = isAdmin || record.submittedById === session.user.id;
              return (
                <MobileCardRow
                  key={record.id}
                  actions={
                    canOpen ? (
                      <Button asChild variant="outline" size="icon">
                        <Link
                          href={`/records/${record.id}`}
                          aria-label={tp.openRecordAria.replace("{n}", record.jobNumber)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {tr.jobNumber}{record.jobNumber}
                    </span>
                    <StatusBadge status={record.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DataField label={tr.date} value={formatDate(record.date, locale)} />
                    <DataField label={tr.typeOfWork} value={record.typeOfWork} />
                    <DataField label={tp.submittedBy} value={record.submittedBy?.name ?? "—"} />
                  </div>
                </MobileCardRow>
              );
            })}
          </MobileCardList>
        )}
      </section>
    </div>
  );
}
