import Link from "next/link";
import { ArrowRight, FolderKanban, MapPin, Search, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import type { Prisma } from "@prisma/client";

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
    ...(isAdmin ? {} : { teamId: { in: teamIds ?? [] } }),
    ...statusWhere,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { address: { contains: query, mode: "insensitive" } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const projects = await prisma.project.findMany({
    where,
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      address: true,
      status: true,
      customer: { select: { name: true } },
    },
  });

  const hasTeam = isAdmin || (teamIds?.length ?? 0) > 0;
  const filtering = Boolean(query) || status !== "active";
  const t = (await getT()).projects;

  const statusChips: { label: string; value: StatusFilter }[] = [
    { label: t.statusActive, value: "active" },
    { label: t.statusCompleted, value: "completed" },
    { label: t.filterAll, value: "all" },
  ];
  function chipHref(next: StatusFilter) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (next !== "active") p.set("status", next);
    const qs = p.toString();
    return qs ? `/records/projects?${qs}` : "/records/projects";
  }

  return (
    <div className="flex flex-col gap-4">
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
          <FilterChip key={chip.value} href={chipHref(chip.value)} active={status === chip.value}>
            {chip.label}
          </FilterChip>
        ))}
      </div>

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
        <MobileCardList>
          {projects.map((p) => (
            <MobileCardRow
              key={p.id}
              actions={
                <Button asChild variant="outline" size="icon">
                  <Link href={`/records/projects/${p.id}`} aria-label={t.openAria.replace("{name}", p.name)}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {p.name}
                </span>
                <ProjectStatusBadge status={p.status} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DataField label={t.customer} value={p.customer?.name ?? t.noCustomer} />
                <DataField
                  label={t.address}
                  value={
                    p.address ? (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {p.address}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </MobileCardRow>
          ))}
        </MobileCardList>
      )}
    </div>
  );
}
