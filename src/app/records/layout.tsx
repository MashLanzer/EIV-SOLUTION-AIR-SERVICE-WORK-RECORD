import { WorkerNav } from "@/components/layout/WorkerNav";
import { getLatestActivityAt } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";

export default async function RecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const scope = { organizationId, userId: session.user.id, isAdmin: false };
  // Badge on the worker's Records tab: how many of their records were
  // returned and are waiting to be fixed and resubmitted. Plus the newest
  // activity timestamp that drives the header bell's unread dot.
  const [returnedCount, latestActivityAt] = await Promise.all([
    prisma.workRecord.count({
      where: {
        organizationId,
        submittedById: session.user.id,
        status: "NEEDS_CHANGES",
      },
    }),
    getLatestActivityAt(scope),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <WorkerNav
        name={session.user.name ?? session.user.email ?? ""}
        returnedCount={returnedCount}
        latestActivityAt={latestActivityAt ? latestActivityAt.getTime() : null}
      />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] native:pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {children}
      </main>
    </div>
  );
}
