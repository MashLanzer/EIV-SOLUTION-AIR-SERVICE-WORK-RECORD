import { ArrowUpCircle, Check, CreditCard, Settings2, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createBillingPortalSessionAction, createCheckoutSessionAction } from "@/actions/billing";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { stripeEnabled } from "@/lib/stripe";
import { PLANS, planLabel, planMaxUsers } from "@/lib/plans";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; error?: string }>;
}) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  const { upgraded, error } = await searchParams;

  const [org, userCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        plan: true,
        featureInvoicing: true,
        featureEstimates: true,
        featurePortal: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
      },
    }),
    prisma.user.count({ where: { organizationId } }),
  ]);

  const t = (await getT());
  const b = t.settings.billing;
  const plan = org?.plan ?? null;
  const def = plan ? PLANS[plan] : null;
  const cap = planMaxUsers(plan);
  const modules = [
    { label: b.invoicing, on: org?.featureInvoicing ?? true },
    { label: b.estimates, on: org?.featureEstimates ?? true },
    { label: b.portal, on: org?.featurePortal ?? true },
  ];

  const isPro = plan === "PRO";
  const hasCustomer = Boolean(org?.stripeCustomerId);
  const pastDue = org?.subscriptionStatus === "past_due" || org?.subscriptionStatus === "unpaid";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <PageHeader title={b.title} backHref="/admin/settings" backLabel={t.settings.title} />

      {upgraded && <Alert variant="success">{b.upgradedToast}</Alert>}
      {error === "unconfigured" && <Alert variant="warning">{b.unconfigured}</Alert>}
      {pastDue && <Alert variant="warning">{b.pastDue}</Alert>}

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {b.currentPlan}
              </div>
              <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {planLabel(plan)}
              </div>
              {def && (
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  {def.priceMonthly > 0 ? `$${def.priceMonthly}${b.perMonth}` : b.free}
                </div>
              )}
            </div>
            <CreditCard className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
          </div>
          {def && <p className="text-sm text-neutral-600 dark:text-neutral-300">{def.blurb}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {b.users}
            </div>
            <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {userCount}
              {cap !== null && <span className="text-base text-neutral-400"> / {cap}</span>}
            </div>
            <div className="text-xs text-neutral-400">
              {cap === null ? b.unlimitedUsers : b.upToUsers.replace("{n}", String(cap))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {b.modules}
            </div>
            {modules.map((m) => (
              <div key={m.label} className="flex items-center gap-2 text-sm">
                {m.on ? (
                  <Check className="h-4 w-4 text-success-text" />
                ) : (
                  <X className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
                )}
                <span className={m.on ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400"}>
                  {m.label}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          {!stripeEnabled ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{b.contactToChange}</p>
          ) : hasCustomer ? (
            <>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{b.manageDesc}</p>
              <form action={createBillingPortalSessionAction}>
                <Button type="submit" variant="outline">
                  <Settings2 className="h-4 w-4" />
                  {b.manageBilling}
                </Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{b.upgradeDesc}</p>
              <form action={createCheckoutSessionAction}>
                <Button type="submit">
                  <ArrowUpCircle className="h-4 w-4" />
                  {b.upgradeCta.replace("{n}", String(PLANS.PRO.priceMonthly))}
                </Button>
              </form>
            </>
          )}
          {isPro && !hasCustomer && <p className="text-xs text-neutral-400">{b.manualNote}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
