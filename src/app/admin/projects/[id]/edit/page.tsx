import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

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

  const teams = await prisma.team.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <Link
          href={`/admin/projects/${id}`}
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Edit project
        </h1>
      </div>
      <Card>
        <CardContent className="p-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
