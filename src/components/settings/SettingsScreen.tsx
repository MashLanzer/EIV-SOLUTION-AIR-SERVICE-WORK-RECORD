"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Info,
  Mail,
  ShieldCheck,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";

import { LogoutButton } from "@/components/layout/LogoutButton";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { InviteCodeCard } from "@/components/settings/InviteCodeCard";
import { ResetHistoryDialog } from "@/components/settings/ResetHistoryDialog";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsList";
import { updateOrganizationNameAction } from "@/actions/organization";
import { updateProfileNameAction } from "@/actions/profile";

// The product version shown in About. Product name is fixed (AeroTrack); the
// per-company name lives in the Company section.
const APP_VERSION = "AeroTrack 1.0";

// Taps on the Role value needed to reveal the admin-only Danger zone -
// deliberately obscure (like Android's "tap Build number 7 times"), so the
// destructive reset never sits in plain view.
const TAPS_TO_REVEAL = 7;

export function SettingsScreen({
  name,
  email,
  role,
  backHref,
  companyName,
  inviteCode,
}: {
  name: string;
  email: string;
  role: "ADMIN" | "WORKER";
  backHref: string;
  // Company name, editable by admins only.
  companyName?: string;
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

      {/* Profile */}
      <SettingsSection title="Profile">
        <InlineEditRow
          icon={UserIcon}
          label="Display name"
          value={name}
          placeholder="Your name"
          action={updateProfileNameAction}
          helpWhenEditing="Shown on your submitted records, comments and team lists."
        />
        <SettingsRow
          icon={Mail}
          label={email}
          sublabel="Signed in with Google"
        />
        <SettingsRow
          icon={ShieldCheck}
          label={isAdmin ? "Admin" : "Worker"}
          sublabel="Your access level"
          onClick={bumpTaps}
        />
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Changes apply on this device only."
      >
        <AppearanceSettings />
      </SettingsSection>

      {/* Company (admin only) */}
      {isAdmin && companyName !== undefined && (
        <SettingsSection title="Company">
          <InlineEditRow
            icon={Building2}
            label="Company name"
            value={companyName}
            placeholder="Company name"
            action={updateOrganizationNameAction}
            helpWhenEditing="Appears on the work record PDF header."
          />
        </SettingsSection>
      )}

      {isAdmin && inviteCode !== undefined && (
        <InviteCodeCard code={inviteCode} />
      )}

      {/* About */}
      <SettingsSection title="About">
        <SettingsRow icon={Info} label="Version" trailing={APP_VERSION} />
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
