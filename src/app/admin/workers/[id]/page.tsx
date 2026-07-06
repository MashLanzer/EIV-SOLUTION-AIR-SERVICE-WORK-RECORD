import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, ClipboardList, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleWorkerActiveButton } from "@/components/workers/ToggleWorkerActiveButton";
import { UpdateWorkerEmailForm } from "@/components/workers/UpdateWorkerEmailForm";
import { UpdateWorkerRoleForm } from "@/components/workers/UpdateWorkerRoleForm";
import { prisma } from "@/lib/prisma";

function formatJoined(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function WorkerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const worker = await prisma.user.findUnique({ where: { id } });
  if (!worker) notFound();

  const [otherActiveAdmins, recordCount] = await Promise.all([
    prisma.user.count({
      where: { role: "ADMIN", active: true, id: { not: worker.id } },
    }),
    prisma.workRecord.count({ where: { submittedById: worker.id } }),
  ]);
  const isLastActiveAdmin =
    worker.role === "ADMIN" && worker.active && otherActiveAdmins === 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {worker.name}
          </h1>
          <Badge variant={worker.role === "ADMIN" ? "default" : "secondary"}>
            {worker.role === "ADMIN" ? "Admin" : "Worker"}
          </Badge>
          <Badge variant={worker.active ? "success" : "destructive"}>
            {worker.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="mt-1 flex flex-col gap-1 text-sm text-neutral-500 dark:text-neutral-400">
          <a
            href={`mailto:${worker.email}`}
            className="flex w-fit items-center gap-1.5 hover:text-primary"
          >
            <Mail className="h-4 w-4 shrink-0" />
            {worker.email}
          </a>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 shrink-0" />
            Joined {formatJoined(worker.createdAt)}
          </span>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {recordCount}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Records submitted
              </div>
            </div>
          </div>
          {recordCount > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/records?workerId=${worker.id}`}>
                View
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Manage
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-2">
              <Label>Authorized Google email</Label>
              <UpdateWorkerEmailForm
                userId={worker.id}
                currentEmail={worker.email}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <UpdateWorkerRoleForm
                userId={worker.id}
                currentRole={worker.role}
                disableDemote={isLastActiveAdmin}
              />
            </div>

            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
              <ToggleWorkerActiveButton
                workerId={worker.id}
                active={worker.active}
                name={worker.name}
                disableDeactivate={isLastActiveAdmin}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
