import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  // Badge on the Records tab: how many records are waiting for review.
  const pendingReviewCount = await prisma.workRecord.count({
    where: { organizationId: requireOrgId(session), status: "SUBMITTED" },
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        name={session.user.name ?? session.user.email ?? ""}
        pendingReviewCount={pendingReviewCount}
      />
      <main className="max-w-6xl px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:ml-60 sm:px-8 sm:pb-6">
        {children}
      </main>
    </div>
  );
}
