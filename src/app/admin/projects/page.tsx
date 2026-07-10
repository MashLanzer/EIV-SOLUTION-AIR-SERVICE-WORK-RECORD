import Link from "next/link";
import { ArrowRight, FolderKanban, MapPin, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectsMapCard } from "@/components/projects/ProjectsMapCard";
import { ProjectsTeamsTabs } from "@/components/projects/ProjectsTeamsTabs";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

export default async function AdminProjectsPage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const projects = await prisma.project.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { records: true } } },
  });

  const pins = projects
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
    }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <ProjectsTeamsTabs />
        <Button asChild>
          <Link href="/admin/projects/new">
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      {pins.length > 0 && <ProjectsMapCard pins={pins} />}

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project (a jobsite) to group its work and photos."
          action={
            <Button asChild variant="outline" className="mt-2">
              <Link href="/admin/projects/new">
                <Plus className="h-4 w-4" />
                New Project
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden sm:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Jobs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                          {p.name}
                        </TableCell>
                        <TableCell className="text-neutral-500 dark:text-neutral-400">
                          {p.address ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p._count.records}
                        </TableCell>
                        <TableCell>
                          <ProjectStatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="icon">
                            <Link href={`/admin/projects/${p.id}`} aria-label={`Open ${p.name}`}>
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
            {projects.map((p) => (
              <MobileCardRow
                key={p.id}
                actions={
                  <Button asChild variant="outline" size="icon">
                    <Link href={`/admin/projects/${p.id}`} aria-label={`Open ${p.name}`}>
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
                  <DataField
                    label="Address"
                    value={
                      p.address ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {p.address}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DataField
                    label="Jobs"
                    value={<span className="tabular-nums">{p._count.records}</span>}
                  />
                </div>
              </MobileCardRow>
            ))}
          </MobileCardList>
        </>
      )}
    </div>
  );
}
