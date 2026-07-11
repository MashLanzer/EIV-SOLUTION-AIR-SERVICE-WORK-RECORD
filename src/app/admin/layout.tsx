import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getLatestActivityAt } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const scope = { organizationId, userId: session.user.id, isAdmin: true };
  // Badge on the Records tab: how many records are waiting for review. Plus the
  // newest activity timestamp driving the header bell's unread dot.
  const [pendingReviewCount, latestActivityAt] = await Promise.all([
    prisma.workRecord.count({
      where: { organizationId, status: "SUBMITTED" },
    }),
    getLatestActivityAt(scope),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        name={session.user.name ?? session.user.email ?? ""}
        pendingReviewCount={pendingReviewCount}
        latestActivityAt={latestActivityAt ? latestActivityAt.getTime() : null}
      />
      <main className="max-w-6xl px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] native:pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:ml-60 sm:px-8 sm:pb-6">
        {children}
      </main>
    </div>
  );
}
