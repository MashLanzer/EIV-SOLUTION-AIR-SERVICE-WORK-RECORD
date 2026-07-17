"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Award, CalendarClock, CalendarOff, Camera, CheckCircle2, ChevronRight, Circle, Clock, DollarSign, ListTodo, Mail, MapPin, PenLine, Percent, Phone, Plus, Sparkles, ShieldCheck, Trash2, User as UserIcon, Wrench, X } from "lucide-react";
import Link from "next/link";
import type { RecordStatus } from "@prisma/client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineEditRow } from "@/components/settings/InlineEditRow";
import { SignaturePad, type SignaturePadHandle } from "@/components/forms/SignaturePad";
import { StatusBadge } from "@/components/records/StatusBadge";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsList";
import { updateProfileNameAction, updateProfilePhoneAction, saveStoredSignatureAction, clearStoredSignatureAction, addSkillAction, removeSkillAction, updateProfileAvatarAction, removeProfileAvatarAction } from "@/actions/profile";
import { requestTimeOffAction, cancelTimeOffRequestAction, type TimeOffFormState } from "@/actions/timeOff";
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

interface MetricPair {
  current: number;
  previous: number;
}
interface MonthCompare {
  records: MetricPair;
  hours: MetricPair;
  approvalRate: MetricPair;
}
interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number;
}
interface TimeOffEntry {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string | null;
  status: "PENDING" | "APPROVED" | "DENIED";
}

export function ProfileScreen({
  name,
  email,
  phone,
  storedSignature,
  memberSince,
  locale,
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
  payThisMonth,
  currency,
  monthCompare,
  activityDays,
  timeOff,
}: {
  name: string;
  email: string;
  phone: string | null;
  storedSignature: string | null;
  // ISO date the account was created, and the viewer's locale for formatting.
  memberSince: string | null;
  locale: string;
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
  // This person's approved pay for the current month, and the org's currency
  // symbol. Workers only.
  payThisMonth: number;
  currency: string;
  // This month vs last, a 12-week activity heatmap, and upcoming time off.
  monthCompare: MonthCompare;
  activityDays: ActivityDay[];
  timeOff: TimeOffEntry[];
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
  const incomplete = doneCount < checklist.length;
  const sigRef = useRef<SignaturePadHandle>(null);
  const [saving, setSaving] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [skillError, setSkillError] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // Signature and skills live in bottom sheets, opened from Account rows; the
  // time-off request form opens in one too.
  const [sheet, setSheet] = useState<null | "signature" | "skills" | "timeoff">(null);

  // Which tabs to show. Workers get a rich Summary; the Activity tab only
  // appears when there's something in it; Account is always present. When only
  // one tab qualifies we drop the tab bar entirely (nothing to switch to).
  // Which rich Summary cards have data (workers submit records; admins don't).
  const hasActivityMap = activityDays.some((d) => d.count > 0);
  const hasMonthCompare =
    !isAdmin &&
    (monthCompare.records.current > 0 || monthCompare.records.previous > 0);
  // Always show Summary now that the time-off request lives there and is
  // available to everyone.
  const hasSummary = true;

  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const monthYearFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  // Parse a "YYYY-MM-DD" as UTC midnight so formatting never drifts a day.
  const asUtc = (d: string) => new Date(`${d}T00:00:00.000Z`);
  const memberSinceLabel = memberSince
    ? t.memberSince.replace("{date}", monthYearFmt.format(asUtc(memberSince.slice(0, 10))))
    : null;
  const hasActivity = needsAttention.length > 0 || recentRecords.length > 0;
  const availableTabs = [
    hasSummary ? ("summary" as const) : null,
    hasActivity ? ("activity" as const) : null,
    "account" as const,
  ].filter(Boolean) as ("summary" | "activity" | "account")[];
  const [tab, setTab] = useState<"summary" | "activity" | "account">(
    availableTabs[0]
  );
  const tabLabel: Record<"summary" | "activity" | "account", string> = {
    summary: t.tabSummary,
    activity: t.tabActivity,
    account: t.tabAccount,
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link
        href={backHref}
        className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc.back}
      </Link>

      {/* Identity hero: a themed banner (adapts to the org palette) with the
          avatar overlapping its lower edge, then name + role, and — for
          workers — a quick stat strip built into the card. */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 animate-fade-up">
        <div className="h-24 bg-gradient-to-br from-accent-soft via-accent-soft/50 to-transparent dark:from-neutral-800 dark:via-neutral-800/50 dark:to-neutral-900" />
        <div className="flex flex-col items-center px-4 pb-4 text-center">
          <form
            action={async (formData) => {
              setAvatarSaving(true);
              setAvatarError(null);
              const res = await updateProfileAvatarAction(undefined, formData);
              if (res?.error) setAvatarError(res.error);
              setAvatarSaving(false);
            }}
            className="-mt-12"
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
            <div className="relative">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-white dark:ring-neutral-950"
                />
              ) : (
                <AvatarInitials
                  name={name || email}
                  className="h-24 w-24 text-2xl ring-4 ring-white dark:ring-neutral-950"
                />
              )}
              <button
                type="button"
                disabled={avatarSaving}
                onClick={() => document.getElementById("avatar-file")?.click()}
                aria-label={avatarUrl ? t.changePhoto : t.addPhoto}
                className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </form>

          <p className="mt-3 truncate text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {name || t.yourAccount}
          </p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {roleLabel}
          </span>
          {memberSinceLabel && (
            <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">
              {memberSinceLabel}
            </p>
          )}

          {avatarError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {avatarError}
            </p>
          )}
          {avatarUrl && (
            <button
              type="button"
              disabled={avatarSaving}
              onClick={async () => {
                setAvatarSaving(true);
                await removeProfileAvatarAction();
                setAvatarSaving(false);
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-destructive-text disabled:opacity-50 dark:text-neutral-500"
            >
              <Trash2 className="h-3 w-3" />
              {t.removePhoto}
            </button>
          )}
        </div>

        {/* Quick stats built into the hero (workers only). */}
        {!isAdmin && (
          <div className="grid grid-cols-4 divide-x divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {[
              { value: String(stats.totalRecords), label: t.total },
              { value: String(stats.approvedRecords), label: t.approved },
              { value: String(stats.pendingRecords), label: t.pending },
              { value: `${metrics.approvalRate}%`, label: t.approvalRate },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5 px-1 py-3">
                <span className="text-base font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {s.value}
                </span>
                <span className="text-center text-[10px] uppercase leading-tight tracking-wide text-neutral-400 dark:text-neutral-500">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab bar (only when there's more than one tab to switch between) */}
      {availableTabs.length > 1 && (
        <div className="flex rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {availableTabs.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === key
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              )}
              aria-pressed={tab === key}
            >
              {tabLabel[key]}
            </button>
          ))}
        </div>
      )}

      {/* ---------------- SUMMARY ---------------- */}
      {tab === "summary" && hasSummary && (
        <div className="flex flex-col gap-5">
          {/* This month vs last (workers) */}
          {hasMonthCompare && (
            <SettingsSection title={t.monthVsLast}>
              <div className="grid grid-cols-3 divide-x divide-neutral-200 dark:divide-neutral-800">
                <CompareCell
                  label={t.cmpRecords}
                  pair={monthCompare.records}
                  sameLabel={t.samAsLast}
                />
                <CompareCell
                  label={t.cmpHours}
                  pair={monthCompare.hours}
                  sameLabel={t.samAsLast}
                />
                <CompareCell
                  label={t.cmpApproval}
                  pair={monthCompare.approvalRate}
                  suffix="%"
                  sameLabel={t.samAsLast}
                />
              </div>
            </SettingsSection>
          )}

          {/* 12-week activity heatmap (workers) */}
          {hasActivityMap && (
            <SettingsSection title={t.activityMapTitle} description={t.activityMapDesc}>
              <div className="p-4">
                <ActivityHeatmap
                  days={activityDays}
                  lessLabel={t.activityLess}
                  moreLabel={t.activityMore}
                />
              </div>
            </SettingsSection>
          )}

          {/* Time off - the worker's own days off + pending requests, with a
              button to request more (office approves). */}
          <SettingsSection title={t.timeOffTitle} description={t.timeOffDesc}>
            {timeOff.length > 0 && (
              <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {timeOff.map((entry) => {
                  const start = asUtc(entry.startDate);
                  const end = asUtc(entry.endDate);
                  const range =
                    entry.startDate === entry.endDate
                      ? dateFmt.format(start)
                      : `${dateFmt.format(start)} – ${dateFmt.format(end)}`;
                  return (
                    <TimeOffRequestRow
                      key={entry.id}
                      entry={entry}
                      range={range}
                      pendingLabel={t.timeOffPending}
                      approvedLabel={t.timeOffApproved}
                      deniedLabel={t.timeOffDenied}
                      withdrawLabel={t.timeOffWithdraw}
                    />
                  );
                })}
              </div>
            )}
            <div className="p-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setSheet("timeoff")}
              >
                <CalendarOff className="h-4 w-4" />
                {t.timeOffRequest}
              </Button>
            </div>
          </SettingsSection>

          {/* Completeness nudge - only until every useful field is filled */}
          {incomplete && (
            <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
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
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
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
                className="flex items-center justify-center gap-1 border-t border-neutral-100 px-4 py-2.5 text-sm font-medium text-primary hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                {t.viewSchedule}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </SettingsSection>
          )}

          {/* Stats - workers only; admins don't submit records. */}
          {!isAdmin && (
            <SettingsSection title={t.statistics} description={t.statsDesc}>
              <div className="flex flex-col gap-2 px-4 pb-4 pt-4">
                {/* Approved pay this month - the figure a worker cares about
                    most, so it leads the stats. */}
                <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-accent-soft/40 p-4 dark:border-neutral-800">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <DollarSign className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                      {currency}{payThisMonth.toFixed(2)}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      {t.payThisMonth}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <StatCard icon={Percent} label={t.approvalRate} value={`${metrics.approvalRate}%`} />
                  <StatCard icon={Clock} label={t.hoursThisMonth} value={String(metrics.hoursThisMonth)} />
                </div>
                <WeeklyTrend weekly={metrics.weekly} label={t.trendLabel} thisWeekLabel={t.thisWeek} />
              </div>
            </SettingsSection>
          )}

          {/* Teams */}
          {teams.length > 0 && (
            <SettingsSection title={t.teams} description={t.teamsDesc}>
              <div className="flex flex-wrap gap-2 px-4 py-4">
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
        </div>
      )}

      {/* ---------------- ACTIVITY ---------------- */}
      {tab === "activity" && hasActivity && (
        <div className="flex flex-col gap-5">
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

          {/* Recent activity */}
          {recentRecords.length > 0 && (
            <SettingsSection title={t.recentActivity} description={t.recentActivityDesc}>
              <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {recentRecords.map((r) => (
                  <Link
                    key={r.id}
                    href={`${recordHrefBase}/${r.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
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
        </div>
      )}

      {/* ---------------- ACCOUNT ---------------- */}
      {tab === "account" && (
        <div className="flex flex-col gap-5">
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
              fieldName="phone"
            />
            <SettingsRow icon={Mail} label={email} sublabel={t.signedInGoogle} />
            <SettingsRow icon={ShieldCheck} label={roleLabel} sublabel={t.accessLevel} />
            {/* Signature and skills open in a sheet, keeping the tab compact. */}
            <SettingsRow
              icon={PenLine}
              label={t.savedSignature}
              sublabel={storedSignature ? t.signatureSaved : t.signatureNotSet}
              onClick={() => setSheet("signature")}
              trailing={
                <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              }
            />
            <SettingsRow
              icon={Wrench}
              label={t.skills}
              sublabel={
                skills.length > 0
                  ? skills.map((s) => s.name).join(", ")
                  : t.noSkillsYet
              }
              onClick={() => setSheet("skills")}
              trailing={
                <ChevronRight className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              }
            />
          </SettingsSection>
        </div>
      )}

      {/* Signature sheet */}
      <BottomSheet
        open={sheet === "signature"}
        onClose={() => setSheet(null)}
        title={t.savedSignature}
        closeLabel={tc.close}
      >
        <form
          action={async (formData) => {
            setSaving(true);
            setSigError(null);
            const res = await saveStoredSignatureAction(undefined, formData);
            if (res?.error) setSigError(res.error);
            setSaving(false);
            if (!res?.error) setSheet(null);
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.savedSigDesc}</p>
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
              disabled={saving}
              className="flex-1"
              onClick={() => {
                const dataUrl = sigRef.current?.getDataUrl();
                if (!dataUrl) return;
                const input = document.getElementById("sig-hidden") as HTMLInputElement;
                if (input) input.value = dataUrl;
                const form = input.closest("form");
                if (form) form.requestSubmit();
              }}
            >
              <PenLine className="h-4 w-4" />
              {storedSignature ? t.update : t.saveSignature}
            </Button>
            {storedSignature && (
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  await clearStoredSignatureAction();
                  setSheet(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t.clear}
              </Button>
            )}
          </div>
        </form>
      </BottomSheet>

      {/* Skills sheet */}
      <BottomSheet
        open={sheet === "skills"}
        onClose={() => setSheet(null)}
        title={t.skills}
        closeLabel={tc.close}
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
          className="flex flex-col gap-3"
        >
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.skillsDesc}</p>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
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
        </form>
      </BottomSheet>

      {/* Time off request sheet */}
      <BottomSheet
        open={sheet === "timeoff"}
        onClose={() => setSheet(null)}
        title={t.timeOffRequest}
        closeLabel={tc.close}
      >
        <TimeOffRequestForm
          labels={{
            start: t.timeOffStart,
            end: t.timeOffEnd,
            reason: t.timeOffReason,
            reasonPlaceholder: t.timeOffReasonPlaceholder,
            send: t.timeOffSend,
            sending: t.timeOffSending,
            error: t.timeOffRequestError,
          }}
          onDone={() => setSheet(null)}
        />
      </BottomSheet>
    </div>
  );
}

// A worker's own time-off entry on the profile: date range + status badge, and
// a Withdraw button while it's still pending.
function TimeOffRequestRow({
  entry,
  range,
  pendingLabel,
  approvedLabel,
  deniedLabel,
  withdrawLabel,
}: {
  entry: TimeOffEntry;
  range: string;
  pendingLabel: string;
  approvedLabel: string;
  deniedLabel: string;
  withdrawLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <CalendarOff className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 tabular-nums dark:text-neutral-100">
          {range}
        </p>
        {entry.reason && (
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {entry.reason}
          </p>
        )}
      </div>
      {entry.status === "PENDING" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => cancelTimeOffRequestAction(entry.id))}
          className="shrink-0 text-xs font-medium text-neutral-400 hover:text-destructive-text disabled:opacity-50 dark:text-neutral-500"
        >
          {withdrawLabel}
        </button>
      ) : null}
      <Badge
        variant={
          entry.status === "APPROVED"
            ? "success"
            : entry.status === "DENIED"
              ? "destructive"
              : "warning"
        }
      >
        {entry.status === "APPROVED"
          ? approvedLabel
          : entry.status === "DENIED"
            ? deniedLabel
            : pendingLabel}
      </Badge>
    </div>
  );
}

// The time-off request form (worker asks for days off; the office approves).
function TimeOffRequestForm({
  labels,
  onDone,
}: {
  labels: {
    start: string;
    end: string;
    reason: string;
    reasonPlaceholder: string;
    send: string;
    sending: string;
    error: string;
  };
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<TimeOffFormState, FormData>(
    requestTimeOffAction,
    undefined
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // Close the sheet once the request lands cleanly.
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state?.ok, onDone]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="req-start" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {labels.start}
          </label>
          <Input
            id="req-start"
            name="startDate"
            type="date"
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (!end || end < e.target.value) setEnd(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="req-end" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {labels.end}
          </label>
          <Input
            id="req-end"
            name="endDate"
            type="date"
            required
            min={start || undefined}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="req-reason" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {labels.reason}
        </label>
        <Input id="req-reason" name="reason" placeholder={labels.reasonPlaceholder} maxLength={120} />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive-text" role="alert">{labels.error}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.sending : labels.send}
      </Button>
    </form>
  );
}

// One metric in the "this month vs last" strip: the current value big, with a
// signed delta vs last month (green up / red down / muted when unchanged).
function CompareCell({
  label,
  pair,
  suffix = "",
  sameLabel,
}: {
  label: string;
  pair: { current: number; previous: number };
  suffix?: string;
  sameLabel: string;
}) {
  const delta = pair.current - pair.previous;
  return (
    <div className="flex flex-col items-center gap-1 px-1 py-4">
      <span className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {pair.current}
        {suffix}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </span>
      {delta === 0 ? (
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500" title={sameLabel}>
          —
        </span>
      ) : (
        <span
          className={cn(
            "text-[11px] font-medium tabular-nums",
            delta > 0 ? "text-success-text" : "text-destructive-text"
          )}
        >
          {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
          {suffix}
        </span>
      )}
    </div>
  );
}

// A GitHub-style contribution grid: 12 columns (weeks) × 7 rows (days). Cells
// are tinted by count against the busiest day, so a steady week doesn't read as
// empty. Input is a fixed oldest→newest run of days.
function ActivityHeatmap({
  days,
  lessLabel,
  moreLabel,
}: {
  days: { date: string; count: number }[];
  lessLabel: string;
  moreLabel: string;
}) {
  const max = Math.max(1, ...days.map((d) => d.count));
  // Chunk into weeks of 7 (already aligned oldest→newest).
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const level = (count: number) => {
    if (count === 0) return "bg-neutral-100 dark:bg-neutral-800";
    const ratio = count / max;
    if (ratio > 0.66) return "bg-primary";
    if (ratio > 0.33) return "bg-primary/60";
    return "bg-primary/30";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((d) => (
              <span
                key={d.date}
                title={`${d.date}: ${d.count}`}
                className={cn("h-3.5 w-3.5 rounded-[3px]", level(d.count))}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-500">
        <span>{lessLabel}</span>
        <span className="h-3 w-3 rounded-[3px] bg-neutral-100 dark:bg-neutral-800" />
        <span className="h-3 w-3 rounded-[3px] bg-primary/30" />
        <span className="h-3 w-3 rounded-[3px] bg-primary/60" />
        <span className="h-3 w-3 rounded-[3px] bg-primary" />
        <span>{moreLabel}</span>
      </div>
    </div>
  );
}

// A neutral stat tile used inside the Statistics section (approval rate, hours).
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListTodo;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </span>
      <span className="text-center text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
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
    <div className="flex flex-col gap-1.5 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
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
