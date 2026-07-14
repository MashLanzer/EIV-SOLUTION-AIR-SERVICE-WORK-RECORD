import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { SkipLink } from "@/components/layout/SkipLink";
import { ImpersonationBanner } from "@/components/super/ImpersonationBanner";
import { getLatestActivityAt } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireReviewer } from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reviewers (admins + supervisors) can enter the admin area; management pages
  // inside keep their own requireAdmin guard, so supervisor access fails closed.
  const session = await requireReviewer();
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
      {session.user.impersonating && (
        <ImpersonationBanner orgName={session.user.impersonating.name} />
      )}
      <SkipLink />
      <AdminSidebar
        name={session.user.name ?? session.user.email ?? ""}
        avatarUrl={session.user.avatarUrl ?? null}
        isSupervisor={session.user.role === "SUPERVISOR"}
        pendingReviewCount={pendingReviewCount}
        latestActivityAt={latestActivityAt ? latestActivityAt.getTime() : null}
      />
      <main
        id="main-content"
        className="max-w-6xl px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] native:pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:ml-60 sm:px-8 sm:pb-6"
      >
        {children}
      </main>
    </div>
  );
}
