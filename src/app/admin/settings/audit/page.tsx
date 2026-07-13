import Link from "next/link";
import type { Role } from "@prisma/client";
import { ChevronLeft, History, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function RoleAuditPage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const events = await prisma.roleChangeEvent.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      actorName: true,
      targetName: true,
      fromRole: true,
      toRole: true,
      createdAt: true,
    },
  });

  const dict = await getT();
  const s = dict.settings.audit;
  const w = dict.workers;
  const locale = await getLocale();
  const fmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const roleLabel = (role: Role) =>
    role === "ADMIN" ? w.roleAdmin : role === "SUPERVISOR" ? w.roleSupervisor : w.roleWorker;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/settings"
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ChevronLeft className="h-4 w-4" />
          {dict.settings.title}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {s.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{s.description}</p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={History} title={s.empty} description={s.emptyDesc} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-900 dark:text-neutral-100">
                      {s.changed
                        .replace("{actor}", e.actorName)
                        .replace("{target}", e.targetName)}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      {s.fromTo
                        .replace("{from}", roleLabel(e.fromRole))
                        .replace("{to}", roleLabel(e.toRole))}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                      {fmt.format(e.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
