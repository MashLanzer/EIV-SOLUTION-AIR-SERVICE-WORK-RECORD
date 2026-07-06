"use client";

// Computed client-side so the greeting/date reflect the viewer's own clock,
// not the server's - a dashboard that says "Good evening" at 9am because
// the server happens to be in a different timezone reads as broken.
// suppressHydrationWarning is the sanctioned escape hatch for exactly this
// case (React docs: text that's necessarily different between server and
// client, like a clock) - narrower than an effect-based mount dance.
function greetingText(name?: string | null) {
  const hour = new Date().getHours();
  const salutation =
    hour < 12 ? "Good morning" : hour < 19 ? "Good afternoon" : "Good evening";
  return name ? `${salutation}, ${name.split(" ")[0]}` : salutation;
}

function dateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function DashboardGreeting({ name }: { name?: string | null }) {
  return (
    <div>
      <h1
        suppressHydrationWarning
        className="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
      >
        {greetingText(name)}
      </h1>
      <p suppressHydrationWarning className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
        {dateLabel()}
      </p>
    </div>
  );
}
