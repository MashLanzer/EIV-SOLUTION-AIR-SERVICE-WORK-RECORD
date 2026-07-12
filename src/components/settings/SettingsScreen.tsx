"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Camera,
  Coins,
  DollarSign,
  FileText,
  Info,
  Lock,
  MapPin,
  PenLine,
  Phone,
  ShieldCheck,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";

import { LogoutButton } from "@/components/layout/LogoutButton";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { CompanyLogoRow } from "@/components/settings/CompanyLogoRow";
import { DefaultNotesRow } from "@/components/settings/DefaultNotesRow";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { InviteCodeCard } from "@/components/settings/InviteCodeCard";
import { PolicyToggle } from "@/components/settings/PolicyToggle";
import { ResetHistoryDialog } from "@/components/settings/ResetHistoryDialog";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsList";
import { useT } from "@/components/i18n/LocaleProvider";
import {
  setLockApprovedRecordsAction,
  setRequireCustomerSignatureAction,
  setRequireHelperAction,
  setRequirePhotoAction,
  updateCompanyFieldAction,
  updateOrganizationNameAction,
} from "@/actions/organization";

// The product version shown in About. Product name is fixed (AeroTrack); the
// per-company name lives in the Company section.
const APP_VERSION = "AeroTrack 1.0";

// Taps on the About version row needed to reveal the admin-only Danger zone -
// deliberately obscure (like Android's "tap Build number 7 times"), so the
// destructive reset never sits in plain view.
const TAPS_TO_REVEAL = 7;

// Company-wide settings, all as strings for the inline editors (pay is the
// plain number, e.g. "25" or "25.00").
export interface CompanySettings {
  name: string;
  phone: string;
  address: string;
  license: string;
  leadPay: string;
  helperPay: string;
  currency: string;
  requirePhoto: boolean;
  requireHelper: boolean;
  requireCustomerSignature: boolean;
  lockApprovedRecords: boolean;
  logoUrl: string | null;
  defaultWorkNotes: string;
}

export function SettingsScreen({
  role,
  backHref,
  company,
  inviteCode,
}: {
  role: "ADMIN" | "WORKER";
  backHref: string;
  // Present for admins only.
  company?: CompanySettings;
  // The company's invite code, shown to admins only.
  inviteCode?: string | null;
}) {
  const t = useT();
  const s = t.settings;
  const isAdmin = role === "ADMIN";
  const tapsRef = useRef(0);
  const [revealed, setRevealed] = useState(false);

  function bumpTaps() {
    if (!isAdmin || revealed) return;
    tapsRef.current += 1;
    if (tapsRef.current >= TAPS_TO_REVEAL) setRevealed(true);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <Link
          href={backHref}
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.common.back}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {s.title}
        </h1>
      </div>

      {/* Appearance */}
      <SettingsSection
        title={t.appearance.section}
        description={t.appearance.onThisDevice}
      >
        <AppearanceSettings />
      </SettingsSection>

      {/* Company (admin only) */}
      {isAdmin && company && (
        <SettingsSection
          title={s.company.section}
          description={s.company.description}
        >
          <InlineEditRow
            icon={Building2}
            label={s.company.name}
            value={company.name}
            placeholder={s.company.name}
            action={updateOrganizationNameAction}
          />
          <InlineEditRow
            icon={Phone}
            label={s.company.phone}
            value={company.phone}
            placeholder="(555) 123-4567"
            action={updateCompanyFieldAction.bind(null, "phone")}
          />
          <InlineEditRow
            icon={MapPin}
            label={s.company.address}
            value={company.address}
            placeholder="123 Main St, City, ST"
            action={updateCompanyFieldAction.bind(null, "address")}
          />
          <InlineEditRow
            icon={FileText}
            label={s.company.license}
            value={company.license}
            placeholder="e.g. LIC-000000"
            action={updateCompanyFieldAction.bind(null, "license")}
          />
          <CompanyLogoRow url={company.logoUrl} />
          <InlineEditRow
            icon={Coins}
            label={s.company.currency}
            value={company.currency}
            placeholder="$"
            action={updateCompanyFieldAction.bind(null, "currency")}
            helpWhenEditing={s.company.currencyHelp}
          />
        </SettingsSection>
      )}

      {/* Work record policy + defaults (admin only) */}
      {isAdmin && company && (
        <SettingsSection
          title={s.workRecords.section}
          description={s.workRecords.description}
        >
          <PolicyToggle
            icon={Camera}
            label={s.workRecords.requirePhoto}
            sublabel={s.workRecords.requirePhotoHint}
            initial={company.requirePhoto}
            action={setRequirePhotoAction}
            ariaLabel={s.workRecords.requirePhoto}
          />
          <PolicyToggle
            icon={Users}
            label={s.workRecords.requireHelper}
            sublabel={s.workRecords.requireHelperHint}
            initial={company.requireHelper}
            action={setRequireHelperAction}
          />
          <PolicyToggle
            icon={PenLine}
            label={s.workRecords.requireCustomerSignature}
            sublabel={s.workRecords.requireCustomerSignatureHint}
            initial={company.requireCustomerSignature}
            action={setRequireCustomerSignatureAction}
          />
          <PolicyToggle
            icon={Lock}
            label={s.workRecords.lockApproved}
            sublabel={s.workRecords.lockApprovedHint}
            initial={company.lockApprovedRecords}
            action={setLockApprovedRecordsAction}
          />
          <InlineEditRow
            icon={DollarSign}
            label={`${s.workRecords.defaultLeadPay} (${company.currency})`}
            value={company.leadPay}
            placeholder="0.00"
            action={updateCompanyFieldAction.bind(null, "leadPay")}
            helpWhenEditing={s.workRecords.defaultLeadPayHelp}
          />
          <InlineEditRow
            icon={DollarSign}
            label={`${s.workRecords.defaultHelperPay} (${company.currency})`}
            value={company.helperPay}
            placeholder="0.00"
            action={updateCompanyFieldAction.bind(null, "helperPay")}
            helpWhenEditing={s.workRecords.defaultHelperPayHelp}
          />
          <SettingsRow
            icon={Tag}
            label={s.workRecords.workTypes}
            sublabel={s.workRecords.workTypesHint}
            href="/admin/settings/work-types"
          />
          <DefaultNotesRow value={company.defaultWorkNotes} />
        </SettingsSection>
      )}

      {isAdmin && inviteCode !== undefined && (
        <InviteCodeCard code={inviteCode} />
      )}

      {/* Access level (read-only, everyone) */}
      <SettingsSection title={s.about.section}>
        <SettingsRow
          icon={ShieldCheck}
          label={isAdmin ? s.about.admin : s.about.worker}
          sublabel={s.about.accessLevel}
        />
        <SettingsRow
          icon={Info}
          label={s.about.version}
          trailing={APP_VERSION}
          onClick={bumpTaps}
        />
      </SettingsSection>

      {/* Account actions */}
      <SettingsSection>
        <LogoutButton />
      </SettingsSection>

      {/* Danger zone - admin only, hidden behind the 7-tap reveal */}
      {revealed && isAdmin && (
        <SettingsSection
          title={s.danger.section}
          description={s.danger.description}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive-soft text-destructive-text">
              <Trash2 className="h-4.5 w-4.5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {s.danger.reset}
              </p>
            </div>
            <ResetHistoryDialog />
          </div>
        </SettingsSection>
      )}
    </div>
  );
}
