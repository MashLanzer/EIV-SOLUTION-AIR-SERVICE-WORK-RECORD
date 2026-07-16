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
import type { ProjectStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { NewProjectButton } from "@/components/projects/NewProjectButton";
import { ProjectStatusMenu } from "@/components/projects/ProjectStatusMenu";
import { ProjectsMapCard } from "@/components/projects/ProjectsMapCard";
import { ProjectsTeamsTabs } from "@/components/projects/ProjectsTeamsTabs";
import { TeamChip } from "@/components/teams/TeamColorDot";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n";

// The order the status sections render in. Active is always shown (even
// empty), the others only when they hold something.
const SECTION_ORDER: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED"];

type ProjectRow = {
  id: string;
  name: string;
  address: string | null;
  status: ProjectStatus;
  latitude: number | null;
  longitude: number | null;
  customer: { id: string; name: string } | null;
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

function ProjectCard({ project, t }: { project: ProjectRow; t: Dictionary["projects"] }) {
  const progress = checklistProgress(project.checklists);
  return (
    <Card className="relative transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
      {/* The status menu floats above the card's tap link (it's an interactive
          sibling, not nested inside the anchor). */}
      <ProjectStatusMenu
        projectId={project.id}
        status={project.status}
        className="absolute right-3 top-3 z-10"
      />
      <Link
        href={`/admin/projects/${project.id}`}
        className="flex flex-col gap-3 rounded-xl p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
      >
        {/* Header: identity block. pr-28 only here clears the floating status
            menu; the progress bar and footer below still span the full width. */}
        <div className="flex items-start gap-3 pr-28">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
              {project.name}
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

        {/* Checklist progress: the "at a glance" completion of a jobsite. The
            bar only appears once there's a checklist. */}
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
                className="h-full rounded-full bg-neutral-800 dark:bg-neutral-200 transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer: team + photo/record counts in one row that spans the card,
            so the card reads as tidy zones instead of scattered lines. */}
        <div className="flex items-center gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 text-xs text-neutral-500 dark:text-neutral-400">
          {project.team && (
            <TeamChip
              name={project.team.name}
              color={project.team.color}
              seed={project.team.id}
            />
          )}
          <span className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            {(project._count.photos === 1 ? t.photoCountOne : t.photoCountMany).replace("{n}", String(project._count.photos))}
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            {(project._count.records === 1 ? t.jobCountOne : t.jobCountMany).replace("{n}", String(project._count.records))}
          </span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
        </div>
      </Link>
    </Card>
  );
}

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const rawParams = await searchParams;
  const rawQ = Array.isArray(rawParams.q) ? rawParams.q[0] : rawParams.q;
  const query = rawQ?.trim() || undefined;
  const rawTeam = Array.isArray(rawParams.team) ? rawParams.team[0] : rawParams.team;
  const teamFilter = rawTeam?.trim() || undefined;

  const [teams, customers, projects] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: {
        organizationId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { address: { contains: query, mode: "insensitive" as const } },
                { customer: { name: { contains: query, mode: "insensitive" as const } } },
              ],
            }
          : {}),
        ...(teamFilter
          ? teamFilter === "none"
            ? { teamId: null }
            : { teamId: teamFilter }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, color: true } },
        _count: { select: { records: true, photos: true } },
        checklists: { select: { items: { select: { done: true } } } },
      },
    }),
  ]);

  const pins = projects
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      href: `/admin/projects/${p.id}`,
    }));

  const byStatus = SECTION_ORDER.map((status) => ({
    status,
    items: projects.filter((p) => p.status === status),
  }));

  const isFiltered = Boolean(query || teamFilter);
  const hasProjects = projects.length > 0;
  const dict = await getT();
  const t = dict.projects;
  const projectStatusLabel: Record<ProjectStatus, string> = {
    ACTIVE: t.statusActive,
    ON_HOLD: t.statusOnHold,
    COMPLETED: t.statusCompleted,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <ProjectsTeamsTabs />
        <NewProjectButton teams={teams} customers={customers} />
      </div>

      {/* Search (name/address) + team filter as a GET form, matching the
          Customers/Workers filter pattern. */}
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <Input
            type="search"
            name="q"
            placeholder={t.searchPlaceholder}
            defaultValue={query}
            className="pl-9"
            aria-label={t.searchAria}
          />
        </div>
        <div className="flex gap-2">
          <Select
            name="team"
            defaultValue={teamFilter ?? ""}
            aria-label={t.filterByTeam}
            className="sm:w-48"
          >
            <option value="">{t.allTeams}</option>
            <option value="none">{t.noTeam}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            {t.filter}
          </Button>
        </div>
      </form>

      {pins.length > 0 && <ProjectsMapCard pins={pins} />}

      {!hasProjects ? (
        isFiltered ? (
          <EmptyState
            icon={SearchX}
            title={t.noMatches}
            description={t.noMatchesDesc}
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link href="/admin/projects">{t.clearFilters}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FolderKanban}
            title={t.noProjectsYet}
            description={t.createProjectDesc}
            action={
              <NewProjectButton
                teams={teams}
                customers={customers}
                variant="outline"
                className="mt-2"
              />
            }
          />
        )
      ) : (
        byStatus.map(({ status, items }) => {
          // Hide empty non-Active sections; Active always renders so the page
          // never looks broken when everything's on hold/done.
          if (items.length === 0 && status !== "ACTIVE") return null;
          return (
            <section key={status} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.statusCount.replace("{label}", projectStatusLabel[status]).replace("{n}", String(items.length))}
              </h2>
              {items.length === 0 ? (
                <Card className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
                  {isFiltered ? t.noActiveMatchFilters : t.noActiveProjects}.
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((p) => (
                    <ProjectCard key={p.id} project={p} t={t} />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
