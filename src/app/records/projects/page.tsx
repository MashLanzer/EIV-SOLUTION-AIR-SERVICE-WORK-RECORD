import Link from "next/link";
import { ArrowRight, FolderKanban, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export default async function WorkerProjectsPage() {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const isAdmin = session.user.role === "ADMIN";

  // Workers only see projects assigned to a team they belong to.
  const teamIds = isAdmin ? null : await getWorkerTeamIds(session.user.id);

  const projects = await prisma.project.findMany({
    where: {
      organizationId,
      status: { not: "COMPLETED" },
      ...(isAdmin ? {} : { teamId: { in: teamIds ?? [] } }),
    },
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
  const t = (await getT()).projects;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {t.title}
      </h1>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={FolderKanban}
              title={hasTeam ? t.noProjectsYet : t.notOnTeam}
              description={hasTeam ? t.teamProjectsHere : t.askAdminTeam}
            />
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
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
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
