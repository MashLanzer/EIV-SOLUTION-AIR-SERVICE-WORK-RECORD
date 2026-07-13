import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, ClipboardList, MapPin, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import { ProjectChecklists } from "@/components/projects/ProjectChecklists";
import { ProjectPhotos } from "@/components/projects/ProjectPhotos";
import { GeoPhotoMap } from "@/components/projects/GeoPhotoMap";
import { WeatherCard } from "@/components/projects/WeatherCard";
import { GeocodeNotice } from "@/components/projects/GeocodeNotice";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { StatusBadge } from "@/components/records/StatusBadge";
import { prisma } from "@/lib/prisma";
import { getWeather } from "@/lib/weather";
import { requireOrgId } from "@/lib/orgScope";
import { canAccessProject } from "@/lib/projectAccess";
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
    include: { team: { select: { name: true } } },
  });
  if (!project) notFound();

  const located = project.latitude != null && project.longitude != null;
  const weather = located
    ? await getWeather(project.latitude as number, project.longitude as number)
    : null;

  const [records, photoRows, checklists] = await Promise.all([
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
  ]);

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
    <div className="flex flex-col gap-4">
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

      {hasMap && (
        <>
          <GeoPhotoMap projectPins={projectPins} photoPins={photoPins} />
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
