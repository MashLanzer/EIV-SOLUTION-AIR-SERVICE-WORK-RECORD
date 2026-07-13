"use client";

import { useLocale, useT } from "@/components/i18n/LocaleProvider";

// Computed client-side so the greeting/date reflect the viewer's own clock,
// not the server's - a dashboard that says "Good evening" at 9am because
// the server happens to be in a different timezone reads as broken.
// suppressHydrationWarning is the sanctioned escape hatch for exactly this
// case (React docs: text that's necessarily different between server and
// client, like a clock) - narrower than an effect-based mount dance.

export function DashboardGreeting({
  name,
  pendingReview = 0,
  todayJobs = 0,
}: {
  name?: string | null;
  pendingReview?: number;
  todayJobs?: number;
}) {
  const t = useT().dashboard;
  const locale = useLocale();

  // A one-line "what's on today" summary under the date - only the non-zero
  // parts, so a quiet day just shows the date.
  const summaryParts: string[] = [];
  if (pendingReview > 0) summaryParts.push(t.summaryReview.replace("{n}", String(pendingReview)));
  if (todayJobs > 0) summaryParts.push(t.summaryJobs.replace("{n}", String(todayJobs)));

  function greetingText() {
    const hour = new Date().getHours();
    const salutation =
      hour < 12
        ? t.greetingMorning
        : hour < 19
          ? t.greetingAfternoon
          : t.greetingEvening;
    return name ? `${salutation}, ${name.split(" ")[0]}` : salutation;
  }

  function dateLabel() {
    return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date());
  }

  return (
    <div>
      <h1
        suppressHydrationWarning
        className="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
      >
        {greetingText()}
      </h1>
      <p suppressHydrationWarning className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
        {dateLabel()}
        {summaryParts.length > 0 && (
          <span className="text-neutral-700 dark:text-neutral-300">
            {" · "}
            {summaryParts.join(" · ")}
          </span>
        )}
      </p>
    </div>
  );
}
