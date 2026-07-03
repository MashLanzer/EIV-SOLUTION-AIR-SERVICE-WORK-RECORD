import { notFound } from "next/navigation";
import { KeyRound, Ban, CheckCircle2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  resetWorkerPasswordAction,
  toggleWorkerActiveAction,
} from "@/actions/workers";
import { prisma } from "@/lib/prisma";

export default async function WorkerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tempPassword?: string }>;
}) {
  const { id } = await params;
  const { tempPassword } = await searchParams;

  const worker = await prisma.user.findUnique({ where: { id } });
  if (!worker) notFound();

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{worker.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tempPassword && (
          <Alert variant="success">
            <p className="font-medium">Temporary password:</p>
            <p className="font-mono text-base">{tempPassword}</p>
            <p className="mt-1 text-xs">
              Share this with {worker.name} now — it will not be shown again.
              They will be asked to set a new password on their next sign in.
            </p>
          </Alert>
        )}

        <div className="flex flex-col gap-1 text-sm">
          <div>
            <span className="text-slate-500">Username: </span>
            {worker.username}
          </div>
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

        <div className="flex gap-2">
          <form action={resetWorkerPasswordAction.bind(null, worker.id)}>
            <Button type="submit" variant="outline">
              <KeyRound className="h-4 w-4" />
              Reset Password
            </Button>
          </form>
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
