import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleWorkerActiveButton } from "@/components/workers/ToggleWorkerActiveButton";
import { UpdateWorkerEmailForm } from "@/components/workers/UpdateWorkerEmailForm";
import { UpdateWorkerRoleForm } from "@/components/workers/UpdateWorkerRoleForm";
import { prisma } from "@/lib/prisma";

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const worker = await prisma.user.findUnique({ where: { id } });
  if (!worker) notFound();

  const isLastActiveAdmin =
    worker.role === "ADMIN" &&
    worker.active &&
    (await prisma.user.count({
      where: { role: "ADMIN", active: true, id: { not: worker.id } },
    })) === 0;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {worker.name}
      </h1>

      <Card className="max-w-lg">
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 dark:text-neutral-400">Status:</span>
              <Badge variant={worker.active ? "success" : "destructive"}>
                {worker.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Authorized Google email
            </span>
            <UpdateWorkerEmailForm userId={worker.id} currentEmail={worker.email} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Role</span>
            <UpdateWorkerRoleForm
              userId={worker.id}
              currentRole={worker.role}
              disableDemote={isLastActiveAdmin}
            />
          </div>

          <div className="flex flex-col gap-2">
            <ToggleWorkerActiveButton
              workerId={worker.id}
              active={worker.active}
              name={worker.name}
              disableDeactivate={isLastActiveAdmin}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
