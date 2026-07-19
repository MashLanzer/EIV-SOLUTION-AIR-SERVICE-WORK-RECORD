import Link from "next/link";
import {
  ChevronRight,
  ClipboardList,
  Contact,
  FolderKanban,
  Image as ImageIcon,
  MapPin,
  Search,
  SearchX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectsMapCard } from "@/components/projects/ProjectsMapCard";
import { TeamChip } from "@/components/teams/TeamColorDot";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n";
import type { Prisma, ProjectStatus } from "@prisma/client";

type StatusFilter = "active" | "completed" | "all";
const STATUS_FILTERS: StatusFilter[] = ["active", "completed", "all"];

type ProjectRow = {
  id: string;
  name: string;
  address: string | null;
  status: ProjectStatus;
  customer: { name: string } | null;
  team: { id: string; name: string; color: string | null } | null;
  _count: { records: number; photos: number };
  checklists: { items: { done: boolean }[] }[];
};

function checklistProgress(checklists: ProjectRow["checklists"]) {
  let total = 0;
  let done = 0;
  for (const c of checklists) {
    for (const item of c.items) {
      total++;
      if (item.done) done++;
    }
  }
  return { total, done, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// A worker project card — the admin ProjectCard anatomy (icon tile, address,
// customer, checklist progress, photo/record counts) minus the admin-only status
// menu, so both sides of the app read the same. Whole card taps into the detail.
function ProjectCard({ project, t }: { project: ProjectRow; t: Dictionary["projects"] }) {
  const progress = checklistProgress(project.checklists);
  return (
    <Card className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
      <Link
        href={`/records/projects/${project.id}`}
        className="flex flex-col gap-3 rounded-xl p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 truncate font-semibold text-neutral-900 dark:text-neutral-100">
                {project.name}
              </span>
              <ProjectStatusBadge status={project.status} />
            </div>
            <div className="mt-0.5 flex items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {project.address ? (
                <>
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0">{project.address}</span>
                </>
              ) : (
                <span className="text-neutral-400 dark:text-neutral-600">{t.noAddress}</span>
              )}
            </div>
            {project.customer && (
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                <Contact className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{project.customer.name}</span>
              </div>
            )}
          </div>
        </div>

        {progress.total > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>{t.checklist}</span>
              <span className="tabular-nums">
                {progress.done}/{progress.total} · {progress.pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-neutral-800 transition-all dark:bg-neutral-200"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {project.team && (
            <TeamChip name={project.team.name} color={project.team.color} seed={project.team.id} />
          )}
          <span className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            {(project._count.photos === 1 ? t.photoCountOne : t.photoCountMany).replace(
              "{n}",
              String(project._count.photos)
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            {(project._count.records === 1 ? t.jobCountOne : t.jobCountMany).replace(
              "{n}",
              String(project._count.records)
            )}
          </span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
        </div>
      </Link>
    </Card>
  );
}

export default async function WorkerProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const isAdmin = session.user.role === "ADMIN";

  const { q, status: rawStatus } = await searchParams;
  const query = q?.trim() || undefined;
  const status: StatusFilter = STATUS_FILTERS.includes(rawStatus as StatusFilter)
    ? (rawStatus as StatusFilter)
    : "active";

  // Workers only see projects assigned to a team they belong to.
  const teamIds = isAdmin ? null : await getWorkerTeamIds(session.user.id);
  const teamScope: Prisma.ProjectWhereInput = isAdmin ? {} : { teamId: { in: teamIds ?? [] } };
  const searchScope: Prisma.ProjectWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { address: { contains: query, mode: "insensitive" } },
          { customer: { name: { contains: query, mode: "insensitive" } } },
        ],
      }
    : {};

  // The status chips: "active" (anything not completed) is the default, but a
  // worker can now also reach completed projects — previously impossible.
  const statusWhere: Prisma.ProjectWhereInput =
    status === "completed"
      ? { status: "COMPLETED" }
      : status === "all"
        ? {}
        : { status: { not: "COMPLETED" } };

  const where: Prisma.ProjectWhereInput = {
    organizationId,
    ...teamScope,
    ...statusWhere,
    ...searchScope,
  };

  const [projects, statusGroups] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        address: true,
        status: true,
        latitude: true,
        longitude: true,
        customer: { select: { name: true } },
        team: { select: { id: true, name: true, color: true } },
        _count: { select: { records: true, photos: true } },
        checklists: { select: { items: { select: { done: true } } } },
      },
    }),
    // Per-status counts for the chips (honor the search, ignore the status
    // filter itself) so each chip shows how many it would land on.
    prisma.project.groupBy({
      by: ["status"],
      where: { organizationId, ...teamScope, ...searchScope },
      _count: { _all: true },
    }),
  ]);

  const countFor = (s: ProjectStatus) => statusGroups.find((g) => g.status === s)?._count._all ?? 0;
  const totalCount = statusGroups.reduce((sum, g) => sum + g._count._all, 0);
  const completedCount = countFor("COMPLETED");
  const activeCount = totalCount - completedCount;

  const pins = projects
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      href: `/records/projects/${p.id}`,
    }));

  const hasTeam = isAdmin || (teamIds?.length ?? 0) > 0;
  const filtering = Boolean(query) || status !== "active";
  const t = (await getT()).projects;

  const statusChips: { label: string; value: StatusFilter; count: number }[] = [
    { label: t.statusActive, value: "active", count: activeCount },
    { label: t.statusCompleted, value: "completed", count: completedCount },
    { label: t.filterAll, value: "all", count: totalCount },
  ];
  function chipHref(next: StatusFilter) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (next !== "active") p.set("status", next);
    const qs = p.toString();
    return qs ? `/records/projects?${qs}` : "/records/projects";
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={t.title} />

      <form method="get" className="relative">
        {status !== "active" && <input type="hidden" name="status" value={status} />}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
        <Input
          type="search"
          name="q"
          placeholder={t.searchPlaceholder}
          defaultValue={query}
          className="pl-9"
          aria-label={t.searchAria}
        />
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {statusChips.map((chip) => (
          <FilterChip
            key={chip.value}
            href={chipHref(chip.value)}
            active={status === chip.value}
            count={chip.count}
          >
            {chip.label}
          </FilterChip>
        ))}
      </div>

      {/* A map of my located jobsites (like the admin projects map). */}
      {pins.length > 0 && <ProjectsMapCard pins={pins} />}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            {filtering ? (
              <EmptyState
                icon={SearchX}
                title={t.noMatches}
                description={t.noMatchesDesc}
                action={
                  <Button asChild variant="outline" className="mt-2">
                    <Link href="/records/projects">{t.clearFilters}</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={FolderKanban}
                title={hasTeam ? t.noProjectsYet : t.notOnTeam}
                description={hasTeam ? t.teamProjectsHere : t.askAdminTeam}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
