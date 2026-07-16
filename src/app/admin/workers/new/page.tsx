import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { WorkerForm } from "@/components/workers/WorkerForm";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getAssignablePositions } from "@/lib/positions";
import { getT } from "@/lib/i18n/server";

export default async function NewWorkerPage() {
  const session = await requirePermission("workers.manage");
  const organizationId = requireOrgId(session);
  const [teams, positions] = await Promise.all([
    prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getAssignablePositions(organizationId),
  ]);
  const t = (await getT()).workers;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div>
        <Link
          href="/admin/workers"
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.team}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {t.newWorkerTitle}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t.newWorkerDesc}
            </p>
          </div>
        </div>
      </div>
      <Card>
        <CardContent className="p-4">
          <WorkerForm teams={teams} positions={positions} />
        </CardContent>
      </Card>
    </div>
  );
}
