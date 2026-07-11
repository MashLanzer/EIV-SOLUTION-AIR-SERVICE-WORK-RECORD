export function formatTime(value: string) {
  const [hoursStr, minutesStr] = value.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutesStr.padStart(2, "0")} ${period}`;
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

export function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
