import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ApproveRecordButton } from "@/components/records/ApproveRecordButton";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireReviewer } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";

// Whole days between the submission and now (UTC-agnostic - just elapsed ms).
function daysWaiting(since: Date): number {
  return Math.floor((Date.now() - since.getTime()) / 86_400_000);
}

// A focused inbox for reviewers (admins + supervisors): every record still
// waiting for review, oldest first, with how long it's been waiting and a
// one-tap Approve. Separate from the full /admin/records list so a supervisor
// lands straight on what needs their attention.
export default async function ReviewQueuePage() {
  const session = await requireReviewer();
  const organizationId = requireOrgId(session);

  const [records, returned] = await Promise.all([
    prisma.workRecord.findMany({
      where: { organizationId, status: "SUBMITTED" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        typeOfWork: true,
        createdAt: true,
        submittedBy: { select: { name: true } },
      },
    }),
    // Records the reviewer already sent back that the worker hasn't
    // resubmitted yet - shown as a secondary list so they don't fall through
    // the cracks. updatedAt is when it was last returned.
    prisma.workRecord.findMany({
      where: { organizationId, status: "NEEDS_CHANGES" },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        typeOfWork: true,
        updatedAt: true,
        submittedBy: { select: { name: true } },
      },
    }),
  ]);

  const dict = await getT();
  const t = dict.reviewQueue;
  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
  });

  const count = records.length;
  const countLabel = (count === 1 ? t.countOne : t.countMany).replace("{n}", String(count));
  const returnedLabel = (returned.length === 1 ? t.returnedCountOne : t.returnedCountMany).replace(
    "{n}",
    String(returned.length)
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.title} description={t.desc} />

      {count === 0 && returned.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={Inbox} title={t.empty} description={t.emptyDesc} />
          </CardContent>
        </Card>
      ) : (
        <>
          {count === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.emptyDesc}</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {countLabel}
              </p>
              <div className="flex flex-col gap-2">
                {records.map((r) => {
                  const days = daysWaiting(r.createdAt);
                  const waitLabel =
                    days <= 0
                      ? t.today
                      : (days === 1 ? t.waitingOne : t.waitingMany).replace("{n}", String(days));
                  // Escalate the badge tone the longer a record has waited.
                  const tone = days >= 3 ? "destructive" : days >= 1 ? "warning" : "secondary";
                  return (
                    <Card key={r.id} className="animate-fade-up">
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                              {dict.records.jobNumber}{r.jobNumber}
                            </span>
                            <Badge variant={tone}>{waitLabel}</Badge>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                            {r.customerName} · {r.typeOfWork} · {dateFmt.format(r.createdAt)}
                            {r.submittedBy?.name
                              ? ` · ${t.submittedBy.replace("{name}", r.submittedBy.name)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <ApproveRecordButton recordId={r.id} />
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/records/${r.id}`}>
                              {t.review}
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {returned.length > 0 && (
            <section className="flex flex-col gap-2 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.returnedTitle} · {returnedLabel}
              </p>
              {returned.map((r) => {
                const days = daysWaiting(r.updatedAt);
                const agoLabel =
                  days <= 0
                    ? t.returnedToday
                    : (days === 1 ? t.returnedAgoOne : t.returnedAgoMany).replace(
                        "{n}",
                        String(days)
                      );
                return (
                  <Card key={r.id} className="animate-fade-up">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                            {dict.records.jobNumber}{r.jobNumber}
                          </span>
                          <Badge variant="secondary">{agoLabel}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                          {r.customerName} · {r.typeOfWork}
                          {r.submittedBy?.name
                            ? ` · ${t.submittedBy.replace("{name}", r.submittedBy.name)}`
                            : ""}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="shrink-0">
                        <Link href={`/admin/records/${r.id}`}>
                          {t.review}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
