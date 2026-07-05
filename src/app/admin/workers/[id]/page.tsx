import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{worker.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Status:</span>
            <Badge variant={worker.active ? "success" : "destructive"}>
              {worker.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Authorized Google email
          </span>
          <UpdateWorkerEmailForm userId={worker.id} currentEmail={worker.email} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">Role</span>
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
  );
}
