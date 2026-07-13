"use client";

import { ArrowLeft, Award, CheckCircle2, Clock, ListTodo, Mail, PenLine, Phone, Plus, ShieldCheck, Trash2, User as UserIcon, X } from "lucide-react";
import Link from "next/link";
import type { RecordStatus } from "@prisma/client";

import { useRef, useState } from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { SignaturePad, type SignaturePadHandle } from "@/components/forms/SignaturePad";
import { StatusBadge } from "@/components/records/StatusBadge";
import {
  SettingsCustomRow,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsList";
import { updateProfileNameAction, updateProfilePhoneAction, saveStoredSignatureAction, clearStoredSignatureAction, addSkillAction, removeSkillAction } from "@/actions/profile";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ProfileStats {
  totalRecords: number;
  approvedRecords: number;
  pendingRecords: number;
}

interface TeamInfo {
  id: string;
  name: string;
  color: string | null;
}

interface RecentRecord {
  id: string;
  jobNumber: string;
  customerName: string;
  date: string;
  status: RecordStatus;
}

interface SkillInfo {
  id: string;
  name: string;
}

export function ProfileScreen({
  name,
  email,
  phone,
  storedSignature,
  role,
  backHref,
  stats,
  teams,
  recentRecords,
  skills,
}: {
  name: string;
  email: string;
  phone: string | null;
  storedSignature: string | null;
  role: "ADMIN" | "WORKER";
  backHref: string;
  stats: ProfileStats;
  teams: TeamInfo[];
  recentRecords: RecentRecord[];
  skills: SkillInfo[];
}) {
  const isAdmin = role === "ADMIN";
  const t = useT().profile;
  const tc = useT().common;
  const sigRef = useRef<SignaturePadHandle>(null);
  const [saving, setSaving] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [skillError, setSkillError] = useState<string | null>(null);

  // Stat tiles use the design-system semantic tokens (dark-mode aware) rather
  // than raw Tailwind colors, so they read as one system with the rest of the
  // app: neutral for the total, success for approved, warning for pending.
  function statCard(icon: typeof ListTodo, label: string, value: number, tone: string) {
    const Icon = icon;
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 min-w-0 flex-1">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <Link
          href={backHref}
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc.back}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t.title}
        </h1>
      </div>

      {/* Identity hero */}
      <div className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 text-center">
        <AvatarInitials name={name || email} className="h-16 w-16 text-lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {name || t.yourAccount}
          </p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {isAdmin ? t.admin : t.worker}
          </span>
        </div>
      </div>

      {/* Account */}
      <SettingsSection title={t.account}>
        <InlineEditRow
          icon={UserIcon}
          label={t.displayName}
          value={name}
          placeholder={t.yourNamePlaceholder}
          action={updateProfileNameAction}
          helpWhenEditing={t.nameHelp}
        />
        <InlineEditRow
          icon={Phone}
          label={t.phone}
          value={phone ?? ""}
          placeholder={t.phonePlaceholder}
          action={updateProfilePhoneAction}
          helpWhenEditing={t.phoneHelp}
        />
        <SettingsRow icon={Mail} label={email} sublabel={t.signedInGoogle} />
        <SettingsRow
          icon={ShieldCheck}
          label={isAdmin ? t.admin : t.worker}
          sublabel={t.accessLevel}
        />
      </SettingsSection>

      {/* Stats - workers only; admins don't submit records so theirs are all 0. */}
      {!isAdmin && (
        <SettingsSection
          title={t.statistics}
          description={t.statsDesc}
        >
          <div className="flex gap-2 px-4 pb-4">
            {statCard(ListTodo, t.total, stats.totalRecords, "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400")}
            {statCard(CheckCircle2, t.approved, stats.approvedRecords, "bg-success-soft text-success-text")}
            {statCard(Clock, t.pending, stats.pendingRecords, "bg-warning-soft text-warning-text")}
          </div>
        </SettingsSection>
      )}

      {/* Teams */}
      {teams.length > 0 && (
        <SettingsSection
          title={t.teams}
          description={t.teamsDesc}
        >
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {teams.map((team) => (
              <span
                key={team.id}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: team.color ? `${team.color}20` : undefined,
                  color: team.color ?? undefined,
                }}
              >
                <Award className="h-3.5 w-3.5" />
                {team.name}
              </span>
            ))}
          </div>
        </SettingsSection>
      )}

      {/* Stored signature */}
      <SettingsSection
        title={t.savedSignature}
        description={t.savedSigDesc}
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
              label={t.yourSignature}
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
                {storedSignature ? t.update : t.saveSignature}
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
                  {t.clear}
                </Button>
              )}
            </div>
          </SettingsCustomRow>
        </form>
      </SettingsSection>

      {/* Recent activity */}
      {recentRecords.length > 0 && (
        <SettingsSection
          title={t.recentActivity}
          description={t.recentActivityDesc}
        >
          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {recentRecords.map((r) => (
              <Link
                key={r.id}
                href={`/records/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                  <ListTodo className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    #{r.jobNumber} — {r.customerName}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{r.date}</p>
                </div>
                <span className="shrink-0">
                  <StatusBadge status={r.status} />
                </span>
              </Link>
            ))}
          </div>
        </SettingsSection>
      )}

      {/* Skills */}
      <SettingsSection
        title={t.skills}
        description={t.skillsDesc}
      >
        <form
          action={async (formData) => {
            setSkillError(null);
            const res = await addSkillAction(undefined, formData);
            if (res?.error) setSkillError(res.error);
            else setSkillInput("");
          }}
          onSubmit={(e) => {
            if (!skillInput.trim()) e.preventDefault();
          }}
        >
          <SettingsCustomRow className="flex flex-col gap-3">
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    {s.name}
                    <button
                      type="button"
                      onClick={async () => {
                        await removeSkillAction(s.id);
                      }}
                      className="ml-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      aria-label={t.removeSkillAria.replace("{name}", s.name)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                name="name"
                placeholder={t.skillsPlaceholder}
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="outline" size="default">
                <Plus className="h-4 w-4" />
                {t.add}
              </Button>
            </div>
            {skillError && (
              <p className="text-sm text-destructive" role="alert">{skillError}</p>
            )}
          </SettingsCustomRow>
        </form>
      </SettingsSection>
    </div>
  );
}
