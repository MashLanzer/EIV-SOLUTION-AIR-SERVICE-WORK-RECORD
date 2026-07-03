import { notFound } from "next/navigation";
import { Ban, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpdateWorkerEmailForm } from "@/components/workers/UpdateWorkerEmailForm";
import { toggleWorkerActiveAction } from "@/actions/workers";
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
          <form action={toggleWorkerActiveAction.bind(null, worker.id)}>
            <Button type="submit" variant={worker.active ? "destructive" : "default"}>
              {worker.active ? (
                <Ban className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {worker.active ? "Deactivate" : "Reactivate"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
