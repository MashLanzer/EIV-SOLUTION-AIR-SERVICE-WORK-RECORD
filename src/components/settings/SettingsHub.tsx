"use client";

import Link from "next/link";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpCircle,
  AtSign,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList as ClipboardListIcon,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  Gauge,
  Globe,
  Hash,
  History,
  Inbox,
  ListChecks,
  Lock,
  MapPin,
  Palette,
  PenLine,
  Percent,
  Phone,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Timer,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { SettingsRow, SettingsSection } from "@/components/settings/SettingsList";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { PolicyToggle } from "@/components/settings/PolicyToggle";
import { SettingsSegmented } from "@/components/settings/SettingsSegmented";
import { SettingsSelect } from "@/components/settings/SettingsSelect";
import { CompanyLogoRow } from "@/components/settings/CompanyLogoRow";
import { DefaultNotesRow } from "@/components/settings/DefaultNotesRow";
import { InviteCodeCard } from "@/components/settings/InviteCodeCard";
import { ResetHistoryDialog } from "@/components/settings/ResetHistoryDialog";
import {
  setLockApprovedRecordsAction,
  setNotifyFlagAction,
  setRequireCustomerSignatureAction,
  setRequireHelperAction,
  setRequirePhotoAction,
  setTimeFormatAction,
  setTimeZoneAction,
  setWeekStartsOnAction,
  updateCompanyFieldAction,
  updateOrganizationNameAction,
} from "@/actions/organization";
import { createBillingPortalSessionAction, createCheckoutSessionAction } from "@/actions/billing";
import { TIME_ZONES } from "@/lib/timezone";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";

// Entity icon for an audit row, reusing icons already imported here. Unknown
// types fall back to the generic history icon.
const AUDIT_ICON: Record<string, LucideIcon> = {
  customer: Users,
  project: ClipboardListIcon,
  invoice: CreditCard,
  estimate: FileText,
  organization: Building2,
  settings: Settings2,
};

export interface SettingsAuditData {
  events: {
    id: string;
    actorName: string;
    entityType: string;
    summary: string;
    createdAt: string;
  }[];
  roleEvents: {
    id: string;
    actorName: string;
    targetName: string;
    fromRole: string;
    toRole: string;
    createdAt: string;
  }[];
}

export interface SettingsHubOrg {
  name: string;
  companyPhone: string;
  companyAddress: string;
  licenseNumber: string;
  currencySymbol: string;
  defaultTaxRate: string;
  logoUrl: string | null;
  requirePhoto: boolean;
  requireHelper: boolean;
  requireCustomerSignature: boolean;
  lockApprovedRecords: boolean;
  defaultLeadPay: string;
  defaultHelperPay: string;
  scheduleOverloadThreshold: string;
  defaultWorkNotes: string;
  notifyOnSubmit: boolean;
  notifyOnReview: boolean;
  notifyReminders: boolean;
  notifyReplyTo: string;
  defaultJobDurationMinutes: string;
  reminderLeadHours: string;
  weekStartsOn: string;
  jobNumberPrefix: string;
  pdfFooter: string;
  receiptExpiryDays: string;
  timeFormat: string;
  timeZone: string;
  joinCode: string | null;
}

export interface SettingsHubData {
  org: SettingsHubOrg;
  billing: {
    planLabel: string;
    priceLine: string | null;
    blurb: string | null;
    userCount: number;
    cap: number | null;
    modules: { label: string; on: boolean }[];
    stripeEnabled: boolean;
    hasCustomer: boolean;
    isPro: boolean;
    pastDue: boolean;
    proPrice: number;
  };
}

type SectionKey =
  | "general"
  | "company"
  | "work-records"
  | "team"
  | "notifications"
  | "scheduling"
  | "documents"
  | "localization"
  | "billing"
  | "audit"
  | "role-audit"
  | "advanced";

// The settings hub rows. Tapping a row opens that section's controls in a
// bottom sheet instead of navigating to a page, so everything stays in place.
export function SettingsHub({
  isAdmin,
  data,
  audit = null,
}: {
  isAdmin: boolean;
  data: SettingsHubData | null;
  audit?: SettingsAuditData | null;
}) {
  const t = useT();
  const s = t.settings;
  const h = s.hub;
  const tc = t.common;
  const locale = useLocale();
  const [open, setOpen] = useState<SectionKey | null>(null);

  const org = data?.org;

  const fmtDateTime = (iso: string) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  const roleLabel = (r: string) =>
    r === "ADMIN" ? t.workers.roleAdmin : r === "SUPERVISOR" ? t.workers.roleSupervisor : t.workers.roleWorker;

  const sectionTitle: Record<SectionKey, string> = {
    general: h.general,
    company: s.company.section,
    "work-records": s.workRecords.section,
    team: h.team,
    notifications: h.notifications,
    scheduling: h.scheduling,
    documents: h.documents,
    localization: h.localization,
    billing: h.billing,
    audit: t.audit.title,
    "role-audit": s.audit.title,
    advanced: h.advanced,
  };

  const row = (icon: LucideIcon, label: string, sublabel: string, k: SectionKey) => (
    <SettingsRow icon={icon} label={label} sublabel={sublabel} onClick={() => setOpen(k)} />
  );

  return (
    <>
      <SettingsSection>{row(Palette, h.general, h.generalHint, "general")}</SettingsSection>

      {isAdmin && (
        <>
          <SettingsSection title={h.manageGroup}>
            {row(Building2, s.company.section, h.companyHint, "company")}
            {row(ClipboardListIcon, s.workRecords.section, h.workRecordsHint, "work-records")}
            {row(Users, h.team, h.teamHint, "team")}
          </SettingsSection>

          <SettingsSection>
            {row(Bell, h.notifications, h.notificationsHint, "notifications")}
            {row(CalendarDays, h.scheduling, h.schedulingHint, "scheduling")}
            {row(FileText, h.documents, h.documentsHint, "documents")}
            {row(Globe, h.localization, h.localizationHint, "localization")}
          </SettingsSection>

          <SettingsSection>{row(CreditCard, h.billing, h.billingHint, "billing")}</SettingsSection>

          <SettingsSection title={h.systemGroup}>
            {row(History, t.audit.title, t.audit.desc, "audit")}
            {row(ShieldCheck, s.audit.title, s.audit.rowHint, "role-audit")}
            {row(SlidersHorizontal, h.advanced, h.advancedHint, "advanced")}
          </SettingsSection>
        </>
      )}

      <BottomSheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? sectionTitle[open] : ""}
        closeLabel={tc.close}
      >
        <div className="flex flex-col gap-5">
          {open === "general" && (
            <SettingsSection>
              <AppearanceSettings />
            </SettingsSection>
          )}

          {open === "company" && org && (
            <SettingsSection>
              <InlineEditRow icon={Building2} label={s.company.name} value={org.name} placeholder={s.company.name} action={updateOrganizationNameAction} />
              <InlineEditRow icon={Phone} label={s.company.phone} value={org.companyPhone} placeholder="(555) 123-4567" action={updateCompanyFieldAction.bind(null, "phone")} />
              <InlineEditRow icon={MapPin} label={s.company.address} value={org.companyAddress} placeholder="123 Main St, City, ST" action={updateCompanyFieldAction.bind(null, "address")} />
              <InlineEditRow icon={FileText} label={s.company.license} value={org.licenseNumber} placeholder="e.g. LIC-000000" action={updateCompanyFieldAction.bind(null, "license")} />
              <CompanyLogoRow url={org.logoUrl} />
              <InlineEditRow icon={Coins} label={s.company.currency} value={org.currencySymbol} placeholder="$" action={updateCompanyFieldAction.bind(null, "currency")} helpWhenEditing={s.company.currencyHelp} />
              <InlineEditRow icon={Percent} label={s.company.taxRate} value={org.defaultTaxRate} placeholder="0" action={updateCompanyFieldAction.bind(null, "taxRate")} helpWhenEditing={s.company.taxRateHelp} />
            </SettingsSection>
          )}

          {open === "work-records" && org && (
            <>
              <SettingsSection>
                <PolicyToggle icon={Camera} label={s.workRecords.requirePhoto} sublabel={s.workRecords.requirePhotoHint} initial={org.requirePhoto} action={setRequirePhotoAction} ariaLabel={s.workRecords.requirePhoto} />
                <PolicyToggle icon={Users} label={s.workRecords.requireHelper} sublabel={s.workRecords.requireHelperHint} initial={org.requireHelper} action={setRequireHelperAction} />
                <PolicyToggle icon={PenLine} label={s.workRecords.requireCustomerSignature} sublabel={s.workRecords.requireCustomerSignatureHint} initial={org.requireCustomerSignature} action={setRequireCustomerSignatureAction} />
                <PolicyToggle icon={Lock} label={s.workRecords.lockApproved} sublabel={s.workRecords.lockApprovedHint} initial={org.lockApprovedRecords} action={setLockApprovedRecordsAction} />
              </SettingsSection>
              <SettingsSection>
                <InlineEditRow icon={DollarSign} label={`${s.workRecords.defaultLeadPay} (${org.currencySymbol})`} value={org.defaultLeadPay} placeholder="0.00" action={updateCompanyFieldAction.bind(null, "leadPay")} helpWhenEditing={s.workRecords.defaultLeadPayHelp} />
                <InlineEditRow icon={DollarSign} label={`${s.workRecords.defaultHelperPay} (${org.currencySymbol})`} value={org.defaultHelperPay} placeholder="0.00" action={updateCompanyFieldAction.bind(null, "helperPay")} helpWhenEditing={s.workRecords.defaultHelperPayHelp} />
                <InlineEditRow icon={Gauge} label={s.workRecords.overloadThreshold} value={org.scheduleOverloadThreshold} placeholder="4" action={updateCompanyFieldAction.bind(null, "overloadThreshold")} helpWhenEditing={s.workRecords.overloadThresholdHelp} />
                <DefaultNotesRow value={org.defaultWorkNotes} />
              </SettingsSection>
              <SettingsSection>
                <SettingsRow icon={Tag} label={s.workRecords.workTypes} sublabel={s.workRecords.workTypesHint} href="/admin/settings/work-types" />
                <SettingsRow icon={Wrench} label={s.skillsCatalog.title} sublabel={s.skillsCatalog.rowHint} href="/admin/settings/skills" />
                <SettingsRow icon={ListChecks} label={t.checklists.title} sublabel={t.checklists.subtitle} href="/admin/checklists" />
              </SettingsSection>
            </>
          )}

          {open === "team" && org && (
            <>
              <SettingsSection>
                <SettingsRow icon={Users} label={h.workersRow} sublabel={h.workersHint} href="/admin/workers" />
                <SettingsRow icon={ShieldCheck} label={h.rolesRow} sublabel={h.rolesHint} href="/admin/roles" />
              </SettingsSection>
              <InviteCodeCard code={org.joinCode} />
            </>
          )}

          {open === "notifications" && org && (
            <SettingsSection>
              <PolicyToggle icon={Inbox} label={s.notif.onSubmit} sublabel={s.notif.onSubmitHint} initial={org.notifyOnSubmit} action={setNotifyFlagAction.bind(null, "onSubmit")} />
              <PolicyToggle icon={CheckCircle2} label={s.notif.onReview} sublabel={s.notif.onReviewHint} initial={org.notifyOnReview} action={setNotifyFlagAction.bind(null, "onReview")} />
              <PolicyToggle icon={Clock} label={s.notif.reminders} sublabel={s.notif.remindersHint} initial={org.notifyReminders} action={setNotifyFlagAction.bind(null, "reminders")} />
              <InlineEditRow icon={AtSign} label={s.notif.replyTo} value={org.notifyReplyTo} placeholder="replies@yourcompany.com" action={updateCompanyFieldAction.bind(null, "notifyReplyTo")} helpWhenEditing={s.notif.replyToHint} />
            </SettingsSection>
          )}

          {open === "scheduling" && org && (
            <SettingsSection>
              <InlineEditRow icon={Timer} label={s.scheduling.jobDuration} value={org.defaultJobDurationMinutes} placeholder="120" action={updateCompanyFieldAction.bind(null, "defaultJobDuration")} helpWhenEditing={s.scheduling.jobDurationHint} />
              <InlineEditRow icon={Clock} label={s.scheduling.reminderLead} value={org.reminderLeadHours} placeholder="24" action={updateCompanyFieldAction.bind(null, "reminderLeadHours")} helpWhenEditing={s.scheduling.reminderLeadHint} />
              <SettingsSegmented
                icon={CalendarDays}
                label={s.scheduling.weekStart}
                sublabel={s.scheduling.weekStartHint}
                value={org.weekStartsOn === "0" ? "0" : "1"}
                options={[
                  { value: "0", label: s.scheduling.sunday },
                  { value: "1", label: s.scheduling.monday },
                ]}
                action={setWeekStartsOnAction}
              />
            </SettingsSection>
          )}

          {open === "documents" && org && (
            <SettingsSection>
              <InlineEditRow icon={Hash} label={s.documents.jobPrefix} value={org.jobNumberPrefix} placeholder="WO-" action={updateCompanyFieldAction.bind(null, "jobNumberPrefix")} helpWhenEditing={s.documents.jobPrefixHint} />
              <InlineEditRow icon={FileText} label={s.documents.pdfFooter} value={org.pdfFooter} placeholder="Thank you for your business" action={updateCompanyFieldAction.bind(null, "pdfFooter")} helpWhenEditing={s.documents.pdfFooterHint} />
              <InlineEditRow icon={CalendarClock} label={s.documents.receiptExpiry} value={org.receiptExpiryDays} placeholder="30" action={updateCompanyFieldAction.bind(null, "receiptExpiryDays")} helpWhenEditing={s.documents.receiptExpiryHint} />
            </SettingsSection>
          )}

          {open === "localization" && org && (
            <SettingsSection>
              <SettingsSegmented
                icon={Clock}
                label={s.localization.timeFormat}
                sublabel={s.localization.timeFormatHint}
                value={org.timeFormat === "24" ? "24" : "12"}
                options={[
                  { value: "12", label: s.localization.format12 },
                  { value: "24", label: s.localization.format24 },
                ]}
                action={setTimeFormatAction}
              />
              <SettingsSelect
                icon={Globe}
                label={s.localization.timeZone}
                sublabel={s.localization.timeZoneHint}
                value={org.timeZone}
                options={
                  TIME_ZONES.some((z) => z.value === org.timeZone)
                    ? TIME_ZONES
                    : [{ value: org.timeZone, label: org.timeZone }, ...TIME_ZONES]
                }
                action={setTimeZoneAction}
              />
            </SettingsSection>
          )}

          {open === "billing" && data && <BillingPanel billing={data.billing} b={s.billing} />}

          {open === "audit" && (
            <div className="flex flex-col gap-3">
              {(audit?.events.length ?? 0) === 0 ? (
                <p className="px-1 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {t.audit.empty}
                </p>
              ) : (
                <SettingsSection>
                  {audit!.events.map((e) => {
                    const Icon = AUDIT_ICON[e.entityType] ?? History;
                    return (
                      <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-neutral-900 dark:text-neutral-100">{e.summary}</p>
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                            {e.actorName} · {fmtDateTime(e.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </SettingsSection>
              )}
              <Link
                href="/admin/audit"
                onClick={() => setOpen(null)}
                className="self-start text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                {s.viewFullLog} →
              </Link>
            </div>
          )}

          {open === "role-audit" && (
            <div className="flex flex-col gap-3">
              {(audit?.roleEvents.length ?? 0) === 0 ? (
                <p className="px-1 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  {s.audit.empty}
                </p>
              ) : (
                <SettingsSection>
                  {audit!.roleEvents.map((e) => (
                    <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">
                          {s.audit.changed.replace("{actor}", e.actorName).replace("{target}", e.targetName)}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          {s.audit.fromTo.replace("{from}", roleLabel(e.fromRole)).replace("{to}", roleLabel(e.toRole))} · {fmtDateTime(e.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </SettingsSection>
              )}
              <Link
                href="/admin/settings/audit"
                onClick={() => setOpen(null)}
                className="self-start text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                {s.viewFullLog} →
              </Link>
            </div>
          )}

          {open === "advanced" && (
            <>
              <SettingsSection title={s.danger.section} description={s.danger.description}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive-soft text-destructive-text">
                    <Trash2 className="h-4.5 w-4.5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{s.danger.reset}</p>
                  </div>
                  <ResetHistoryDialog />
                </div>
              </SettingsSection>
            </>
          )}
        </div>
      </BottomSheet>
    </>
  );
}

// Billing lives in a sheet too; the data is computed on the server (no Stripe
// client import). The action forms still redirect to Stripe as before.
function BillingPanel({
  billing,
  b,
}: {
  billing: SettingsHubData["billing"];
  b: ReturnType<typeof useT>["settings"]["billing"];
}) {
  return (
    <div className="flex flex-col gap-4">
      {billing.pastDue && <Alert variant="warning">{b.pastDue}</Alert>}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {b.currentPlan}
            </div>
            <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {billing.planLabel}
            </div>
            {billing.priceLine && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">{billing.priceLine}</div>
            )}
          </div>
          <CreditCard className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
        </div>
        {billing.blurb && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{billing.blurb}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {b.users}
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {billing.userCount}
            {billing.cap !== null && <span className="text-base text-neutral-400"> / {billing.cap}</span>}
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            {billing.cap === null ? b.unlimitedUsers : b.upToUsers.replace("{n}", String(billing.cap))}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {b.modules}
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {billing.modules.map((m) => (
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
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        {!billing.stripeEnabled ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{b.contactToChange}</p>
        ) : billing.hasCustomer ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{b.manageDesc}</p>
            <form action={createBillingPortalSessionAction}>
              <Button type="submit" variant="outline" className="w-full">
                <Settings2 className="h-4 w-4" />
                {b.manageBilling}
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{b.upgradeDesc}</p>
            <form action={createCheckoutSessionAction}>
              <Button type="submit" className="w-full">
                <ArrowUpCircle className="h-4 w-4" />
                {b.upgradeCta.replace("{n}", String(billing.proPrice))}
              </Button>
            </form>
          </div>
        )}
        {billing.isPro && !billing.hasCustomer && (
          <p className="mt-2 text-xs text-neutral-400">{b.manualNote}</p>
        )}
      </div>
    </div>
  );
}
