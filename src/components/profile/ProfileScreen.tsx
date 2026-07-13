"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Award, CalendarClock, Camera, CheckCircle2, ChevronRight, Circle, Clock, ListTodo, Mail, MapPin, PenLine, Percent, Phone, Plus, Sparkles, ShieldCheck, Trash2, User as UserIcon, X } from "lucide-react";
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
import { updateProfileNameAction, updateProfilePhoneAction, saveStoredSignatureAction, clearStoredSignatureAction, addSkillAction, removeSkillAction, updateProfileAvatarAction, removeProfileAvatarAction } from "@/actions/profile";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface ProfileStats {
  totalRecords: number;
  approvedRecords: number;
  pendingRecords: number;
}

interface ProfileMetrics {
  approvalRate: number; // 0-100
  hoursThisMonth: number;
  weekly: number[]; // submissions per week, oldest first
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

interface UpcomingJob {
  id: string;
  title: string;
  dateKey: string; // YYYY-MM-DD, for the schedule day link
  dateLabel: string;
  timeLabel: string | null;
  subtitle: string | null;
}

export function ProfileScreen({
  name,
  email,
  phone,
  storedSignature,
  role,
  backHref,
  recordHrefBase,
  scheduleHref,
  avatarUrl,
  metrics,
  stats,
  teams,
  recentRecords,
  needsAttention,
  upcomingJobs,
  skills,
  skillSuggestions,
}: {
  name: string;
  email: string;
  phone: string | null;
  storedSignature: string | null;
  role: "ADMIN" | "SUPERVISOR" | "WORKER";
  backHref: string;
  // Base path for record links, so they resolve to the caller's area
  // ("/records" for workers, "/admin/records" for admins).
  recordHrefBase: string;
  // Base path for the schedule, used by the "my week" links.
  scheduleHref: string;
  avatarUrl: string | null;
  metrics: ProfileMetrics;
  stats: ProfileStats;
  teams: TeamInfo[];
  recentRecords: RecentRecord[];
  needsAttention: RecentRecord[];
  upcomingJobs: UpcomingJob[];
  skills: SkillInfo[];
  // Distinct skill names already used in the org, to autocomplete the input.
  skillSuggestions: string[];
}) {
  const isAdmin = role === "ADMIN";
  const t = useT().profile;
  const tc = useT().common;
  const roleLabel = role === "ADMIN" ? t.admin : role === "SUPERVISOR" ? t.supervisor : t.worker;

  // Profile "completeness": the fields that actually make the profile useful to
  // the rest of the app. Signature pre-fills every record; phone reaches the
  // person; skills tell admins what they can do. Shown as a nudge until done.
  const checklist = [
    { key: "phone", label: t.completePhone, done: !!phone },
    { key: "signature", label: t.completeSignature, done: !!storedSignature },
    { key: "skills", label: t.completeSkills, done: skills.length > 0 },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const sigRef = useRef<SignaturePadHandle>(null);
  const [saving, setSaving] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [skillError, setSkillError] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Stat tiles use the design-system semantic tokens (dark-mode aware) rather
  // than raw Tailwind colors, so they read as one system with the rest of the
  // app: neutral for the total, success for approved, warning for pending.
  function statCard(icon: typeof ListTodo, label: string, value: string, tone: string) {
    const Icon = icon;
    return (
      <div className="flex flex-col items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 min-w-0 flex-1">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{value}</span>
        <span className="text-center text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
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
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <AvatarInitials name={name || email} className="h-16 w-16 text-lg" />
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {name || t.yourAccount}
          </p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {roleLabel}
          </span>
        </div>
        <form
          action={async (formData) => {
            setAvatarSaving(true);
            setAvatarError(null);
            const res = await updateProfileAvatarAction(undefined, formData);
            if (res?.error) setAvatarError(res.error);
            setAvatarSaving(false);
          }}
          className="flex flex-col items-center gap-1.5"
        >
          <input
            type="file"
            name="avatar"
            id="avatar-file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) e.target.form?.requestSubmit();
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={avatarSaving}
              onClick={() => document.getElementById("avatar-file")?.click()}
            >
              <Camera className="h-3.5 w-3.5" />
              {avatarUrl ? t.changePhoto : t.addPhoto}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={avatarSaving}
                onClick={async () => {
                  setAvatarSaving(true);
                  await removeProfileAvatarAction();
                  setAvatarSaving(false);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t.removePhoto}
              </Button>
            )}
          </div>
          {avatarError && (
            <p className="text-sm text-destructive" role="alert">{avatarError}</p>
          )}
        </form>
      </div>

      {/* Profile completeness nudge - only until every useful field is filled */}
      {doneCount < checklist.length && (
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {t.completeTitle}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t.completeProgress
                  .replace("{done}", String(doneCount))
                  .replace("{total}", String(checklist.length))}
              </p>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5">
            {checklist.map((c) => (
              <li key={c.key} className="flex items-center gap-2 text-sm">
                {c.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success-text" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
                )}
                <span
                  className={cn(
                    c.done
                      ? "text-neutral-400 line-through dark:text-neutral-500"
                      : "text-neutral-700 dark:text-neutral-300"
                  )}
                >
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* My week - jobs assigned to me over the next 7 days */}
      {upcomingJobs.length > 0 && (
        <SettingsSection title={t.myWeek} description={t.myWeekDesc}>
          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {upcomingJobs.map((j) => (
              <Link
                key={j.id}
                href={`${scheduleHref}?date=${j.dateKey}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {j.title}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="capitalize">{j.dateLabel}</span>
                    {j.timeLabel && <span className="tabular-nums">· {j.timeLabel}</span>}
                    {j.subtitle && (
                      <span className="flex items-center gap-1 truncate">
                        · <MapPin className="h-3 w-3 shrink-0" />
                        {j.subtitle}
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
              </Link>
            ))}
          </div>
          <Link
            href={scheduleHref}
            className="flex items-center justify-center gap-1 border-t border-neutral-100 dark:border-neutral-800 px-4 py-2.5 text-sm font-medium text-primary hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            {t.viewSchedule}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </SettingsSection>
      )}

      {/* Needs your attention - records the reviewer sent back to fix */}
      {needsAttention.length > 0 && (
        <SettingsSection title={t.needsAttention} description={t.needsAttentionDesc}>
          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {needsAttention.map((r) => (
              <Link
                key={r.id}
                href={`${recordHrefBase}/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning-text">
                  <AlertTriangle className="h-4 w-4" />
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
          label={roleLabel}
          sublabel={t.accessLevel}
        />
      </SettingsSection>

      {/* Stats - workers only; admins don't submit records so theirs are all 0. */}
      {!isAdmin && (
        <SettingsSection
          title={t.statistics}
          description={t.statsDesc}
        >
          <div className="flex flex-col gap-2 px-4 pb-4">
            <div className="flex gap-2">
              {statCard(ListTodo, t.total, String(stats.totalRecords), "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400")}
              {statCard(CheckCircle2, t.approved, String(stats.approvedRecords), "bg-success-soft text-success-text")}
              {statCard(Clock, t.pending, String(stats.pendingRecords), "bg-warning-soft text-warning-text")}
            </div>
            <div className="flex gap-2">
              {statCard(Percent, t.approvalRate, `${metrics.approvalRate}%`, "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400")}
              {statCard(Clock, t.hoursThisMonth, String(metrics.hoursThisMonth), "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400")}
            </div>
            <WeeklyTrend weekly={metrics.weekly} label={t.trendLabel} thisWeekLabel={t.thisWeek} />
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
                href={`${recordHrefBase}/${r.id}`}
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
                list="skill-suggestions"
                autoComplete="off"
              />
              {skillSuggestions.length > 0 && (
                <datalist id="skill-suggestions">
                  {skillSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
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

// A tiny CSS-only sparkline of submissions per week (oldest → this week). Bars
// scale to the busiest week so a flat run of 1s doesn't read as empty.
function WeeklyTrend({
  weekly,
  label,
  thisWeekLabel,
}: {
  weekly: number[];
  label: string;
  thisWeekLabel: string;
}) {
  const max = Math.max(1, ...weekly);
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      <div className="flex h-12 items-end gap-1.5">
        {weekly.map((n, i) => {
          const last = i === weekly.length - 1;
          return (
            <div
              key={i}
              title={String(n)}
              className={cn(
                "flex-1 rounded-sm transition-colors",
                last ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-700"
              )}
              style={{ height: `${Math.max(6, (n / max) * 100)}%` }}
            />
          );
        })}
      </div>
      <span className="self-end text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {thisWeekLabel}
      </span>
    </div>
  );
}
