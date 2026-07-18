import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, ClipboardList, Mail, Trash2, Wrench } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DeleteWorkerButton } from "@/components/workers/DeleteWorkerButton";
import { ToggleWorkerActiveButton } from "@/components/workers/ToggleWorkerActiveButton";
import { UpdateWorkerEmailForm } from "@/components/workers/UpdateWorkerEmailForm";
import { UpdateWorkerOverloadForm } from "@/components/workers/UpdateWorkerOverloadForm";
import { UpdateWorkerRoleForm } from "@/components/workers/UpdateWorkerRoleForm";
import { WorkerPositionForm } from "@/components/workers/WorkerPositionForm";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";

function formatJoined(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
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
  const session = await requirePermission("workers.manage");
  const organizationId = requireOrgId(session);
  const { id } = await params;

  const worker = await prisma.user.findFirst({
    where: { id, organizationId },
    include: { skills: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
  });
  if (!worker) notFound();

  const [otherActiveAdmins, recordCount, org, positions] = await Promise.all([
    prisma.user.count({
      where: { organizationId, role: "ADMIN", active: true, id: { not: worker.id } },
    }),
    prisma.workRecord.count({ where: { organizationId, submittedById: worker.id } }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { scheduleOverloadThreshold: true },
    }),
    prisma.position.findMany({
      where: { organizationId },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  const orgOverloadDefault = org?.scheduleOverloadThreshold ?? 4;
  const isLastActiveAdmin =
    worker.role === "ADMIN" && worker.active && otherActiveAdmins === 0;
  const dict = await getT();
  const t = dict.workers;
  const locale = await getLocale();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar
          name={worker.name || worker.email}
          avatarUrl={worker.avatarUrl}
          size={48}
          className="h-12 w-12 shrink-0 text-base"
        />
        <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {worker.name}
          </h1>
          <Badge variant={worker.role === "ADMIN" ? "default" : "secondary"}>
            {worker.role === "ADMIN"
              ? t.roleAdmin
              : worker.role === "SUPERVISOR"
                ? t.roleSupervisor
                : t.roleWorker}
          </Badge>
          <Badge variant={worker.active ? "success" : "destructive"}>
            {worker.active ? t.statusActive : t.statusInactive}
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
            {t.joined.replace("{date}", formatJoined(worker.createdAt, locale))}
          </span>
        </div>
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
                {t.recordsSubmitted}
              </div>
            </div>
          </div>
          {recordCount > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/records?workerId=${worker.id}`}>
                {dict.common.view}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Skills - self-entered on the worker's profile, surfaced here so an
          admin can see who's qualified when assigning jobs. */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <Wrench className="h-3.5 w-3.5" />
            {t.skills}
          </div>
          {worker.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {worker.skills.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm text-neutral-700 dark:text-neutral-300"
                >
                  {s.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.noSkills}</p>
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.manage}
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-2">
              <Label>{t.authorizedEmail}</Label>
              <UpdateWorkerEmailForm
                userId={worker.id}
                currentEmail={worker.email}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t.role}</Label>
              <UpdateWorkerRoleForm
                userId={worker.id}
                currentRole={worker.role}
                disableDemote={isLastActiveAdmin}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t.position}</Label>
              <WorkerPositionForm
                userId={worker.id}
                currentPositionId={worker.positionId}
                positions={positions}
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.positionHint}</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t.overloadThreshold}</Label>
              <UpdateWorkerOverloadForm
                userId={worker.id}
                current={worker.scheduleOverloadThreshold}
                orgDefault={orgOverloadDefault}
              />
            </div>

            <div className="grid grid-cols-2 items-start gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-4">
              <ToggleWorkerActiveButton
                workerId={worker.id}
                active={worker.active}
                name={worker.name}
                disableDeactivate={isLastActiveAdmin}
              />
              {/* Deleting an account is gated behind deactivation: turn the
                  worker off first, then the permanent delete becomes
                  available. Their work records are kept either way. */}
              {worker.active ? (
                <div className="flex flex-col gap-1">
                  <Button type="button" variant="outline" className="w-full text-destructive-text" disabled>
                    <Trash2 className="h-4 w-4" />
                    {t.deleteAccount}
                  </Button>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t.deleteFirstHint}
                  </p>
                </div>
              ) : (
                <DeleteWorkerButton workerId={worker.id} name={worker.name} />
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
