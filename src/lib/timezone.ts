// Time-zone helpers. The app stores a job's day (UTC-midnight date) and its
// start as a wall-clock "HH:MM" string with no zone — exactly what the crew
// typed. To fire a reminder at the right real-world moment we need the absolute
// instant that wall-clock time represents in the org's zone; that's what
// zonedWallTimeToUtc does. Display never needs conversion (the stored string is
// already the local wall time).

// The offset (localWallClock − UTC), in ms, that `timeZone` has at `instant`.
// Uses Intl to read the zone's wall-clock parts for the instant and compares
// them to the same numbers read as UTC. Handles DST because it's evaluated at
// the instant itself.
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  // Intl renders midnight as hour 24 in some environments; normalise to 0.
  const hour = map.hour === 24 ? 0 : map.hour;
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return asUtc - instant.getTime();
}

// The UTC instant of a wall-clock time (y, m [1-12], d, hh, mm) in `timeZone`.
// A first guess treats the wall time as if it were UTC, then corrects by the
// zone's offset at that guess — a single correction that is exact except within
// the rare DST-transition hour, which is acceptable for reminders. Falls back to
// treating the input as UTC when the zone is unknown.
export function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timeZone: string
): Date {
  const guessMs = Date.UTC(year, month - 1, day, hours, minutes);
  try {
    const offset = tzOffsetMs(new Date(guessMs), timeZone);
    return new Date(guessMs - offset);
  } catch {
    return new Date(guessMs);
  }
}

// Whether the runtime accepts this IANA zone id (guards the settings action).
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

// A curated, field-service-oriented list for the settings dropdown (UTC + the
// US zones plus a few common others). Not exhaustive — the action accepts any
// zone the runtime recognises, so this is just the friendly shortlist.
export const TIME_ZONES: { value: string; label: string }[] = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Bogota", label: "Bogotá" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/Berlin", label: "Berlin" },
];
