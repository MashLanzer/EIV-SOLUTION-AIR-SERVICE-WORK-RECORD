// Format a "HH:MM" time for display. Defaults to 12-hour ("2:30 PM"); pass
// use24 = true (from the org's Localization setting) for 24-hour ("14:30").
// Unparseable input is returned as-is either way.
export function formatTime(value: string, use24 = false) {
  const [hoursStr, minutesStr] = value.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  const mm = minutesStr.padStart(2, "0");
  if (use24) return `${hoursStr.padStart(2, "0")}:${mm}`;

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${mm} ${period}`;
}

// A start–end range in one call, respecting the same 12/24-hour preference. When
// only a start is given, just that time; when neither, the caller's fallback.
export function formatTimeRange(
  start: string | null,
  end: string | null,
  use24 = false,
  allDay = ""
): string {
  if (start && end) return `${formatTime(start, use24)}–${formatTime(end, use24)}`;
  if (start) return formatTime(start, use24);
  return allDay;
}

// "6h 30m" between two "HH:MM" times on the same day. Returns null when either
// is missing/unparseable or the span is non-positive (overnight/typo).
export function workDuration(arrival: string, departure: string): string | null {
  if (!arrival || !departure) return null;
  const [ah, am] = arrival.split(":").map(Number);
  const [dh, dm] = departure.split(":").map(Number);
  if ([ah, am, dh, dm].some((n) => Number.isNaN(n))) return null;
  const mins = dh * 60 + dm - (ah * 60 + am);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export function formatMoney(value: number, symbol = "$"): string {
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
