import { BadgeCheck, CreditCard, ExternalLink, RefreshCw } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { refreshConnectStatusAction, startConnectOnboardingAction } from "@/actions/paymentsConnect";
import { getPaymentStatus } from "@/lib/payments";
import { requireFeature } from "@/lib/features";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

export const dynamic = "force-dynamic";

// Company-facing setup for online invoice payments (Stripe Connect). The
// company connects its own Standard account; once charges are enabled,
// customers can pay invoices online and the money settles directly into it.
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await requirePermission("payments.manage");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "invoicing");
  const { connected, error } = await searchParams;

  const status = await getPaymentStatus(organizationId);
  const ready = status.connected && status.chargesEnabled;

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="money" />
      <PageHeader title="Online payments" />

      {error === "unconfigured" && (
        <Alert variant="warning">Online payments aren&apos;t available yet. Please contact us.</Alert>
      )}
      {error === "connect" && (
        <Alert variant="warning">Couldn&apos;t start Stripe setup. Please try again.</Alert>
      )}
      {connected && !ready && (
        <Alert variant="warning">
          Almost there — Stripe still needs a few details before you can accept payments. Finish setup, then refresh.
        </Alert>
      )}
      {connected && ready && <Alert variant="success">You&apos;re all set to accept online payments.</Alert>}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Status
              </div>
              <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {ready ? (
                  <>
                    <BadgeCheck className="h-6 w-6 text-success-text" />
                    Active
                  </>
                ) : status.connected ? (
                  "Setup incomplete"
                ) : (
                  "Not connected"
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {ready
                  ? "Customers can pay their invoices online. Payments settle directly into your Stripe account."
                  : "Connect your Stripe account so customers can pay invoices online. Money goes straight to you — we never hold your funds."}
              </p>
            </div>
            <CreditCard className="hidden h-8 w-8 shrink-0 text-neutral-300 dark:text-neutral-600 sm:block" />
          </div>

          {!status.configured ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Online payments aren&apos;t available yet on this deployment. Please contact us.
            </p>
          ) : ready ? (
            <div className="flex flex-wrap gap-2">
              <form action={startConnectOnboardingAction}>
                <Button type="submit" variant="outline">
                  <ExternalLink className="h-4 w-4" />
                  Manage on Stripe
                </Button>
              </form>
              <form action={refreshConnectStatusAction}>
                <Button type="submit" variant="ghost">
                  <RefreshCw className="h-4 w-4" />
                  Refresh status
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <form action={startConnectOnboardingAction}>
                <Button type="submit">
                  <CreditCard className="h-4 w-4" />
                  {status.connected ? "Finish Stripe setup" : "Connect Stripe"}
                </Button>
              </form>
              {status.connected && (
                <form action={refreshConnectStatusAction}>
                  <Button type="submit" variant="ghost">
                    <RefreshCw className="h-4 w-4" />
                    Refresh status
                  </Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-neutral-400">
        Powered by Stripe. Standard processing fees apply and are set by Stripe. AeroTrack never touches your money.
      </p>
    </div>
  );
}
