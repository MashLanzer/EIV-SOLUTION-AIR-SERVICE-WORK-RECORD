import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleWorkerActiveButton } from "@/components/workers/ToggleWorkerActiveButton";
import { UpdateWorkerEmailForm } from "@/components/workers/UpdateWorkerEmailForm";
import { prisma } from "@/lib/prisma";

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const worker = await prisma.user.findUnique({ where: { id } });
  if (!worker) notFound();

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{worker.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Role:</span>
            <Badge variant={worker.role === "ADMIN" ? "default" : "secondary"}>
              {worker.role}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Status:</span>
            <Badge variant={worker.active ? "success" : "destructive"}>
              {worker.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-slate-500">
            Authorized Google email
          </span>
          <UpdateWorkerEmailForm userId={worker.id} currentEmail={worker.email} />
        </div>

        <div className="flex gap-2">
          <ToggleWorkerActiveButton
            workerId={worker.id}
            active={worker.active}
            name={worker.name}
          />
        </div>
      </CardContent>
    </Card>
  );
}
