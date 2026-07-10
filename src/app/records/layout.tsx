import { WorkerNav } from "@/components/layout/WorkerNav";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";

export default async function RecordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  // Badge on the worker's Records tab: how many of their records were
  // returned and are waiting to be fixed and resubmitted.
  const returnedCount = await prisma.workRecord.count({
    where: {
      organizationId: requireOrgId(session),
      submittedById: session.user.id,
      status: "NEEDS_CHANGES",
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <WorkerNav
        name={session.user.name ?? session.user.email ?? ""}
        returnedCount={returnedCount}
      />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-6">
        {children}
      </main>
    </div>
  );
}
