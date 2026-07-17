import { Info, ShieldCheck } from "lucide-react";

import { LogoutButton } from "@/components/layout/LogoutButton";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsList";
import { SettingsHub, type SettingsHubData } from "@/components/settings/SettingsHub";
import { requireOfficeAccess } from "@/lib/authz";
import { requireOrgId } from "@/lib/orgScope";
import { prisma } from "@/lib/prisma";
import { stripeEnabled } from "@/lib/stripe";
import { PLANS, planLabel, planMaxUsers } from "@/lib/plans";
import { getT } from "@/lib/i18n/server";

// The product version shown in About.
const APP_VERSION = "AeroTrack 1.0";

// The settings hub: an iOS-style index. Tapping a section opens its controls in
// a bottom sheet instead of navigating to a page. All the org's settings load
// here once (best-effort — a DB hiccup or a not-yet-migrated column falls back
// to safe defaults so the hub never shows an error screen).
export default async function AdminSettingsPage() {
  const { session } = await requireOfficeAccess();
  const isAdmin = session.user.role === "ADMIN";
  const t = await getT();
  const s = t.settings;

  const role = session.user.role;
  const accessLabel =
    role === "ADMIN" ? s.about.admin : role === "SUPERVISOR" ? s.about.supervisor : s.about.worker;

  // Admin-only data (supervisors don't manage the company, so we only load the
  // org for admins).
  let data: SettingsHubData | null = null;
  if (isAdmin) {
    try {
      const organizationId = requireOrgId(session);
      const [org, userCount] = await Promise.all([
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: {
            name: true,
            companyPhone: true,
            companyAddress: true,
            licenseNumber: true,
            currencySymbol: true,
            defaultTaxRate: true,
            logoUrl: true,
            requirePhoto: true,
            requireHelper: true,
            requireCustomerSignature: true,
            lockApprovedRecords: true,
            defaultLeadPay: true,
            defaultHelperPay: true,
            scheduleOverloadThreshold: true,
            defaultWorkNotes: true,
            notifyOnSubmit: true,
            notifyOnReview: true,
            notifyReminders: true,
            notifyReplyTo: true,
            defaultJobDurationMinutes: true,
            reminderLeadHours: true,
            weekStartsOn: true,
            jobNumberPrefix: true,
            pdfFooter: true,
            receiptExpiryDays: true,
            timeFormat: true,
            timeZone: true,
            joinCode: true,
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

      const plan = org?.plan ?? null;
      const def = plan ? PLANS[plan] : null;
      const cap = planMaxUsers(plan);
      const b = s.billing;

      data = {
        org: {
          name: org?.name ?? "",
          companyPhone: org?.companyPhone ?? "",
          companyAddress: org?.companyAddress ?? "",
          licenseNumber: org?.licenseNumber ?? "",
          currencySymbol: org?.currencySymbol || "$",
          defaultTaxRate: org?.defaultTaxRate != null ? String(Number(org.defaultTaxRate)) : "",
          logoUrl: org?.logoUrl ?? null,
          requirePhoto: org?.requirePhoto ?? false,
          requireHelper: org?.requireHelper ?? false,
          requireCustomerSignature: org?.requireCustomerSignature ?? true,
          lockApprovedRecords: org?.lockApprovedRecords ?? false,
          defaultLeadPay: org?.defaultLeadPay != null ? String(Number(org.defaultLeadPay)) : "",
          defaultHelperPay: org?.defaultHelperPay != null ? String(Number(org.defaultHelperPay)) : "",
          scheduleOverloadThreshold:
            org?.scheduleOverloadThreshold != null ? String(org.scheduleOverloadThreshold) : "4",
          defaultWorkNotes: org?.defaultWorkNotes ?? "",
          notifyOnSubmit: org?.notifyOnSubmit ?? true,
          notifyOnReview: org?.notifyOnReview ?? true,
          notifyReminders: org?.notifyReminders ?? true,
          notifyReplyTo: org?.notifyReplyTo ?? "",
          defaultJobDurationMinutes:
            org?.defaultJobDurationMinutes != null ? String(org.defaultJobDurationMinutes) : "120",
          reminderLeadHours: org?.reminderLeadHours != null ? String(org.reminderLeadHours) : "24",
          weekStartsOn: String(org?.weekStartsOn ?? 1),
          jobNumberPrefix: org?.jobNumberPrefix ?? "",
          pdfFooter: org?.pdfFooter ?? "",
          receiptExpiryDays: org?.receiptExpiryDays != null ? String(org.receiptExpiryDays) : "",
          timeFormat: org?.timeFormat === "24" ? "24" : "12",
          timeZone: org?.timeZone ?? "UTC",
          joinCode: org?.joinCode ?? null,
        },
        billing: {
          planLabel: planLabel(plan),
          priceLine: def ? (def.priceMonthly > 0 ? `$${def.priceMonthly}${b.perMonth}` : b.free) : null,
          blurb: def?.blurb ?? null,
          userCount,
          cap,
          modules: [
            { label: b.invoicing, on: org?.featureInvoicing ?? true },
            { label: b.estimates, on: org?.featureEstimates ?? true },
            { label: b.portal, on: org?.featurePortal ?? true },
          ],
          stripeEnabled,
          hasCustomer: Boolean(org?.stripeCustomerId),
          isPro: plan === "PRO",
          pastDue: org?.subscriptionStatus === "past_due" || org?.subscriptionStatus === "unpaid",
          proPrice: PLANS.PRO.priceMonthly,
        },
      };
    } catch {
      // Never fail the whole hub on a data hiccup — the sheets fall back to
      // safe defaults and still open.
      data = null;
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader title={s.title} />

      <SettingsHub isAdmin={isAdmin} data={data} />

      <SettingsSection title={s.about.section}>
        <SettingsRow icon={ShieldCheck} label={accessLabel} sublabel={s.about.accessLevel} />
        <SettingsRow icon={Info} label={s.about.version} trailing={APP_VERSION} />
      </SettingsSection>

      <SettingsSection>
        <LogoutButton />
      </SettingsSection>
    </div>
  );
}
