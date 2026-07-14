import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { SkipLink } from "@/components/layout/SkipLink";
import { ImpersonationBanner } from "@/components/super/ImpersonationBanner";
import { SupportActiveNotice } from "@/components/super/SupportActiveNotice";
import { getLatestActivityAt } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireReviewer } from "@/lib/session";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";
import { getActiveSupportSessionForOrg } from "@/lib/support";
import { getOrgFeatures } from "@/lib/features";

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
  // Platform owners get a discreet link to the /super console from their
  // account menu, so the hidden route is reachable inside the mobile app too.
  const isSuperAdmin = isSuperAdminEmail(session.user.email);
  // For the company's own admins: is a platform support session open right now?
  // (Skipped while impersonating — the owner already sees the amber banner.)
  const supportActive = session.user.impersonating
    ? null
    : await getActiveSupportSessionForOrg(organizationId);
  // Badge on the Records tab: how many records are waiting for review. Plus the
  // newest activity timestamp driving the header bell's unread dot.
  const [pendingReviewCount, latestActivityAt, features] = await Promise.all([
    prisma.workRecord.count({
      where: { organizationId, status: "SUBMITTED" },
    }),
    getLatestActivityAt(scope),
    getOrgFeatures(organizationId),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {session.user.impersonating && (
        <ImpersonationBanner
          orgName={session.user.impersonating.name}
          readOnly={session.user.impersonating.readOnly}
          expiresAt={session.user.impersonating.expiresAt}
        />
      )}
      {supportActive && <SupportActiveNotice expiresAt={supportActive.expiresAt.toISOString()} />}
      <SkipLink />
      <AdminSidebar
        name={session.user.name ?? session.user.email ?? ""}
        avatarUrl={session.user.avatarUrl ?? null}
        isSupervisor={session.user.role === "SUPERVISOR"}
        isSuperAdmin={isSuperAdmin}
        features={features}
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
