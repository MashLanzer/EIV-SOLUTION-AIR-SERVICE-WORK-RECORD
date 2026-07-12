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
          Back
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Settings
        </h1>
      </div>

      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Changes apply on this device only."
      >
        <AppearanceSettings />
      </SettingsSection>

      {/* Company (admin only) */}
      {isAdmin && company && (
        <SettingsSection
          title="Company"
          description="Company name, phone, address and license appear on the work record PDF."
        >
          <InlineEditRow
            icon={Building2}
            label="Company name"
            value={company.name}
            placeholder="Company name"
            action={updateOrganizationNameAction}
          />
          <InlineEditRow
            icon={Phone}
            label="Phone"
            value={company.phone}
            placeholder="(555) 123-4567"
            action={updateCompanyFieldAction.bind(null, "phone")}
          />
          <InlineEditRow
            icon={MapPin}
            label="Address"
            value={company.address}
            placeholder="123 Main St, City, ST"
            action={updateCompanyFieldAction.bind(null, "address")}
          />
          <InlineEditRow
            icon={FileText}
            label="License number"
            value={company.license}
            placeholder="e.g. LIC-000000"
            action={updateCompanyFieldAction.bind(null, "license")}
          />
          <CompanyLogoRow url={company.logoUrl} />
          <InlineEditRow
            icon={Coins}
            label="Currency symbol"
            value={company.currency}
            placeholder="$"
            action={updateCompanyFieldAction.bind(null, "currency")}
            helpWhenEditing="Shown before money amounts across the app and PDF (e.g. $, €, £)."
          />
        </SettingsSection>
      )}

      {/* Work record policy + defaults (admin only) */}
      {isAdmin && company && (
        <SettingsSection
          title="Work records"
          description="Defaults and rules applied when workers submit records."
        >
          <PolicyToggle
            icon={Camera}
            label="Require a photo"
            sublabel="Records can't be submitted without at least one photo"
            initial={company.requirePhoto}
            action={setRequirePhotoAction}
            ariaLabel="Require a photo to submit a record"
          />
          <PolicyToggle
            icon={Users}
            label="Require a helper"
            sublabel="A helper name must be entered on every record"
            initial={company.requireHelper}
            action={setRequireHelperAction}
          />
          <PolicyToggle
            icon={PenLine}
            label="Require customer signature"
            sublabel="Turn off for unattended jobs where the customer can't sign"
            initial={company.requireCustomerSignature}
            action={setRequireCustomerSignatureAction}
          />
          <PolicyToggle
            icon={Lock}
            label="Lock approved records"
            sublabel="Once approved, a record must be reopened before anyone can edit it"
            initial={company.lockApprovedRecords}
            action={setLockApprovedRecordsAction}
          />
          <InlineEditRow
            icon={DollarSign}
            label={`Default lead pay (${company.currency})`}
            value={company.leadPay}
            placeholder="0.00"
            action={updateCompanyFieldAction.bind(null, "leadPay")}
            helpWhenEditing="Pre-fills the lead pay on a new record; workers can still change it."
          />
          <InlineEditRow
            icon={DollarSign}
            label={`Default helper pay (${company.currency})`}
            value={company.helperPay}
            placeholder="0.00"
            action={updateCompanyFieldAction.bind(null, "helperPay")}
            helpWhenEditing="Pre-fills the helper pay on a new record; workers can still change it."
          />
          <SettingsRow
            icon={Tag}
            label="Work types"
            sublabel="Predefined types of work the crew can pick, by category"
            href="/admin/settings/work-types"
          />
          <DefaultNotesRow value={company.defaultWorkNotes} />
        </SettingsSection>
      )}

      {isAdmin && inviteCode !== undefined && (
        <InviteCodeCard code={inviteCode} />
      )}

      {/* Access level (read-only, everyone) */}
      <SettingsSection title="About">
        <SettingsRow
          icon={ShieldCheck}
          label={isAdmin ? "Admin" : "Worker"}
          sublabel="Your access level"
        />
        <SettingsRow
          icon={Info}
          label="Version"
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
          title="Danger zone"
          description="Permanently deletes everything in your company — records, customers, projects, photos, teams, checklists and comments. User accounts are kept, so you stay signed in. This can't be undone."
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive-soft text-destructive-text">
              <Trash2 className="h-4.5 w-4.5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Reset all company data
              </p>
            </div>
            <ResetHistoryDialog />
          </div>
        </SettingsSection>
      )}
    </div>
  );
}
