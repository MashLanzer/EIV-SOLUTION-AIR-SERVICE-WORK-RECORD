import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Download,
  MapPin,
  Pencil,
  Users2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import { SuccessToast } from "@/components/ui/success-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton";
import { ProjectChecklists } from "@/components/projects/ProjectChecklists";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectPhotos } from "@/components/projects/ProjectPhotos";
import { ProjectsMapCard } from "@/components/projects/ProjectsMapCard";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { StatusBadge } from "@/components/records/StatusBadge";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatSince(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function AdminProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const { id } = await params;
  const { saved } = await searchParams;

  const project = await prisma.project.findFirst({
    where: { id, organizationId },
    include: { team: { select: { id: true, name: true } } },
  });
  if (!project) notFound();

  const teams = await prisma.team.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const [statusGroups, records, photoRows, checklists, templates] = await Promise.all([
    prisma.workRecord.groupBy({
      by: ["status"],
      where: { organizationId, projectId: id },
      _count: { _all: true },
    }),
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
    prisma.checklistTemplate.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const photos = photoRows.map((p) => ({
    id: p.id,
    url: p.url,
    takenAt: p.takenAt.toISOString(),
    takenByName: p.takenBy?.name ?? null,
    hasGps: p.latitude != null,
    tagCount: p._count.photoTags,
    commentCount: p._count.comments,
  }));
  const recordCount = records.length;
  const statusCount = (s: "APPROVED" | "SUBMITTED" | "NEEDS_CHANGES") =>
    statusGroups.find((g) => g.status === s)?._count._all ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message="Project saved" aboveMobileNav />}

      {/* Header - project identity */}
      <Card className="animate-fade-up">
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
              <Link
                href={`/admin/teams/${project.team.id}`}
                className="flex w-fit items-center gap-1.5 hover:text-primary"
              >
                <Users2 className="h-4 w-4 shrink-0" />
                {project.team.name}
              </Link>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" />
              Created {formatSince(project.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Map - only when the address geocoded to coordinates */}
      {project.latitude != null && project.longitude != null && (
        <div
          className="animate-fade-up"
          style={{ animationDelay: "40ms", animationFillMode: "both" }}
        >
          <ProjectsMapCard
            pins={[
              {
                id: project.id,
                name: project.name,
                latitude: project.latitude,
                longitude: project.longitude,
              },
            ]}
          />
        </div>
      )}

      {/* Snapshot */}
      <Card
        className="animate-fade-up"
        style={{ animationDelay: "40ms", animationFillMode: "both" }}
      >
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {recordCount}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Work records
              </div>
            </div>
          </div>
          {recordCount > 0 && (
            <div className="grid grid-cols-3 gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-4">
              <div>
                <div className="text-lg font-semibold tabular-nums text-success-text">
                  {statusCount("APPROVED")}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Approved</div>
              </div>
              <div>
                <div className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {statusCount("SUBMITTED")}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Pending</div>
              </div>
              <div>
                <div className="text-lg font-semibold tabular-nums text-warning-text">
                  {statusCount("NEEDS_CHANGES")}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Needs changes</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklists - track the steps for this job */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Checklists
        </h2>
        <ProjectChecklists
          projectId={project.id}
          checklists={checklists}
          templates={templates}
        />
      </section>

      {/* Photos */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Photos
          </h2>
          {photos.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <a href={`/admin/projects/${project.id}/report`} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                Photo report
              </a>
            </Button>
          )}
        </div>
        <ProjectPhotos projectId={project.id} initialPhotos={photos} />
      </section>

      {/* Job history */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "160ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Work records ({recordCount})
        </h2>
        {records.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={ClipboardList}
                title="No work records yet"
                description="Records assigned to this project will show up here."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden sm:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Job #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type of Work</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>{record.jobNumber}</TableCell>
                          <TableCell>
                            <StatusBadge status={record.status} />
                          </TableCell>
                          <TableCell>{record.typeOfWork}</TableCell>
                          <TableCell>{record.submittedBy?.name ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="outline" size="icon">
                              <Link
                                href={`/admin/records/${record.id}`}
                                aria-label={`Open record ${record.jobNumber}`}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <MobileCardList>
              {records.map((record) => (
                <MobileCardRow
                  key={record.id}
                  actions={
                    <Button asChild variant="outline" size="icon">
                      <Link
                        href={`/admin/records/${record.id}`}
                        aria-label={`Open record ${record.jobNumber}`}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Job #{record.jobNumber}
                    </span>
                    <StatusBadge status={record.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DataField label="Date" value={formatDate(record.date)} />
                    <DataField label="Type of Work" value={record.typeOfWork} />
                    <DataField label="Submitted By" value={record.submittedBy?.name ?? "—"} />
                  </div>
                </MobileCardRow>
              ))}
            </MobileCardList>
          </>
        )}
      </section>

      {/* Manage - edit collapsed + delete */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "200ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Manage
        </h2>
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Project details
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-4 px-4 pb-4">
              <ProjectForm
                projectId={project.id}
                teams={teams}
                defaultValues={{
                  name: project.name,
                  address: project.address ?? "",
                  status: project.status,
                  teamId: project.teamId ?? "",
                }}
              />
              <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/projects/${project.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    Full edit page
                  </Link>
                </Button>
                <DeleteProjectButton projectId={project.id} />
              </div>
            </div>
          </details>
        </Card>
      </section>
    </div>
  );
}
