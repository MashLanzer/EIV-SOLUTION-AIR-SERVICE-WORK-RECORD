"use client";

import { ArrowLeft, Mail, PenLine, Phone, ShieldCheck, Trash2, User as UserIcon } from "lucide-react";
import Link from "next/link";

import { useRef, useState } from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { SignaturePad, type SignaturePadHandle } from "@/components/forms/SignaturePad";
import {
  SettingsCustomRow,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsList";
import { updateProfileNameAction, updateProfilePhoneAction, saveStoredSignatureAction, clearStoredSignatureAction } from "@/actions/profile";

// The Profile screen, split out of Settings so identity and account details can
// grow on their own. Today it carries what used to be the Settings "Profile"
// section (name, email, access level) plus a placeholder for the expanded role
// that will land here later.
export function ProfileScreen({
  name,
  email,
  phone,
  storedSignature,
  role,
  backHref,
}: {
  name: string;
  email: string;
  phone: string | null;
  storedSignature: string | null;
  role: "ADMIN" | "WORKER";
  backHref: string;
}) {
  const isAdmin = role === "ADMIN";
  const sigRef = useRef<SignaturePadHandle>(null);
  const [saving, setSaving] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);

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
        <InlineEditRow
          icon={Phone}
          label="Phone"
          value={phone ?? ""}
          placeholder="(555) 123-4567"
          action={updateProfilePhoneAction}
          helpWhenEditing="Visible to your company admins and team members."
        />
        <SettingsRow icon={Mail} label={email} sublabel="Signed in with Google" />
        <SettingsRow
          icon={ShieldCheck}
          label={isAdmin ? "Admin" : "Worker"}
          sublabel="Your access level"
        />
      </SettingsSection>

      {/* Stored signature */}
      <SettingsSection
        title="Saved signature"
        description="Save your signature so it's pre-filled on every work record."
      >
        <form
          action={async (formData) => {
            setSaving(true);
            setSigError(null);
            const res = await saveStoredSignatureAction(undefined, formData);
            if (res?.error) setSigError(res.error);
            setSaving(false);
          }}
        >
          <SettingsCustomRow className="flex flex-col gap-3">
            <input type="hidden" name="signature" id="sig-hidden" />
            <SignaturePad
              ref={sigRef}
              label="Your signature"
              defaultValue={storedSignature ?? undefined}
            />
            {sigError && (
              <p className="text-sm text-destructive" role="alert">{sigError}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => {
                  const dataUrl = sigRef.current?.getDataUrl();
                  if (!dataUrl) return;
                  const input = document.getElementById("sig-hidden") as HTMLInputElement;
                  if (input) input.value = dataUrl;
                  const form = input.closest("form");
                  if (form) form.requestSubmit();
                }}
              >
                <PenLine className="h-3.5 w-3.5" />
                {storedSignature ? "Update" : "Save signature"}
              </Button>
              {storedSignature && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await clearStoredSignatureAction();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </SettingsCustomRow>
        </form>
      </SettingsSection>
    </div>
  );
}
