import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderKanban } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, organizationId },
  });
  if (!project) notFound();

  const [teams, customers] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const backHref = `/admin/projects/${id}`;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <Link
          href={backHref}
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Project
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Edit project
            </h1>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                {project.name}
              </p>
              <ProjectStatusBadge status={project.status} />
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
          Created {dateFmt.format(project.createdAt)} · Updated{" "}
          {dateFmt.format(project.updatedAt)}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <ProjectForm
            projectId={project.id}
            teams={teams}
            customers={customers}
            cancelHref={backHref}
            defaultValues={{
              name: project.name,
              address: project.address ?? "",
              status: project.status,
              teamId: project.teamId ?? "",
              customerId: project.customerId ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Delete this project. Its work records are kept but will no longer be
            linked to a project. This can&apos;t be undone.
          </p>
          <div>
            <DeleteProjectButton projectId={project.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
