import Link from "next/link";
import { ArrowLeft, FolderKanban } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

export default async function NewProjectPage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
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
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <Link
          href="/admin/projects"
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              New project
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              A jobsite that groups its work records, photos and checklists.
            </p>
          </div>
        </div>
      </div>
      <Card>
        <CardContent className="p-4">
          <ProjectForm teams={teams} customers={customers} />
        </CardContent>
      </Card>
    </div>
  );
}
