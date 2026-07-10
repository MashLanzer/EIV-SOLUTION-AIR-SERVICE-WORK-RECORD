import Link from "next/link";
import { ArrowRight, Plus, Users2 } from "lucide-react";

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
import { ProjectsTeamsTabs } from "@/components/projects/ProjectsTeamsTabs";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

export default async function AdminTeamsPage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const teams = await prisma.team.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true, projects: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <ProjectsTeamsTabs />
        <Button asChild>
          <Link href="/admin/teams/new">
            <Plus className="h-4 w-4" />
            New Team
          </Link>
        </Button>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No teams yet"
          description="Create a team (a crew) to group workers and assign them to projects."
          action={
            <Button asChild variant="outline" className="mt-2">
              <Link href="/admin/teams/new">
                <Plus className="h-4 w-4" />
                New Team
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
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-right">Projects</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                          {t.name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t._count.memberships}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {t._count.projects}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="icon">
                            <Link href={`/admin/teams/${t.id}`} aria-label={`Open ${t.name}`}>
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
            {teams.map((t) => (
              <MobileCardRow
                key={t.id}
                actions={
                  <Button asChild variant="outline" size="icon">
                    <Link href={`/admin/teams/${t.id}`} aria-label={`Open ${t.name}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                }
              >
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {t.name}
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <DataField
                    label="Members"
                    value={<span className="tabular-nums">{t._count.memberships}</span>}
                  />
                  <DataField
                    label="Projects"
                    value={<span className="tabular-nums">{t._count.projects}</span>}
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
