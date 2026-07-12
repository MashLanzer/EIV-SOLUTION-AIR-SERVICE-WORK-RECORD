"use client";

import { ArrowLeft, Mail, ShieldCheck, Sparkles, User as UserIcon } from "lucide-react";
import Link from "next/link";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import {
  SettingsCustomRow,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsList";
import { updateProfileNameAction } from "@/actions/profile";

// The Profile screen, split out of Settings so identity and account details can
// grow on their own. Today it carries what used to be the Settings "Profile"
// section (name, email, access level) plus a placeholder for the expanded role
// that will land here later.
export function ProfileScreen({
  name,
  email,
  role,
  backHref,
}: {
  name: string;
  email: string;
  role: "ADMIN" | "WORKER";
  backHref: string;
}) {
  const isAdmin = role === "ADMIN";

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
          Profile
        </h1>
      </div>

      {/* Identity hero */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
        <AvatarInitials name={name || email} className="h-16 w-16 text-lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {name || "Your account"}
          </p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isAdmin ? "Admin" : "Worker"}
          </span>
        </div>
      </div>

      {/* Account */}
      <SettingsSection title="Account">
        <InlineEditRow
          icon={UserIcon}
          label="Display name"
          value={name}
          placeholder="Your name"
          action={updateProfileNameAction}
          helpWhenEditing="Shown on your submitted records, comments and team lists."
        />
        <SettingsRow icon={Mail} label={email} sublabel="Signed in with Google" />
        <SettingsRow
          icon={ShieldCheck}
          label={isAdmin ? "Admin" : "Worker"}
          sublabel="Your access level"
        />
      </SettingsSection>

      {/* Placeholder for the expanded profile coming later */}
      <SettingsSection
        title="Coming soon"
        description="More profile options are on the way."
      >
        <SettingsCustomRow className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            We&apos;re building out your profile — more to manage here soon.
          </p>
        </SettingsCustomRow>
      </SettingsSection>
    </div>
  );
}
