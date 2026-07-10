import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { requireAdmin } from "@/lib/session";

export default async function NewProjectPage() {
  await requireAdmin();
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
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          New project
        </h1>
      </div>
      <Card>
        <CardContent className="p-4">
          <ProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
