import Link from "next/link";
import { FolderKanban, Search, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsMapCard } from "@/components/projects/ProjectsMapCard";
import { WorkerProjectList, type WorkerProjectData } from "@/components/projects/WorkerProjectList";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import type { Prisma, ProjectStatus } from "@prisma/client";

type StatusFilter = "active" | "completed" | "all";
const STATUS_FILTERS: StatusFilter[] = ["active", "completed", "all"];

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

  const projectData: WorkerProjectData[] = projects.map((p) => {
    let done = 0;
    let total = 0;
    for (const c of p.checklists) {
      for (const item of c.items) {
        total++;
        if (item.done) done++;
      }
    }
    return {
      id: p.id,
      name: p.name,
      address: p.address,
      status: p.status,
      customerName: p.customer?.name ?? null,
      team: p.team,
      records: p._count.records,
      photos: p._count.photos,
      checklistDone: done,
      checklistTotal: total,
    };
  });

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
        <WorkerProjectList projects={projectData} />
      )}
    </div>
  );
}
