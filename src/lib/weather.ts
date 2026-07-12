// Best-effort jobsite weather from Open-Meteo's free forecast API (no API key,
// generous free tier). Never throws: a failed fetch just hides the weather
// card, it never blocks the page. Results are cached briefly so repeated page
// loads don't refetch on every request.

export type WeatherIcon =
  | "clear-day"
  | "clear-night"
  | "partly-day"
  | "partly-night"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunder";

export interface WeatherDay {
  date: string; // ISO date (YYYY-MM-DD)
  icon: WeatherIcon;
  label: string;
  highF: number;
  lowF: number;
}

export interface Weather {
  current: {
    tempF: number;
    label: string;
    icon: WeatherIcon;
    windMph: number;
    highF: number;
    lowF: number;
  };
  days: WeatherDay[]; // today + the next few
}

// WMO weather interpretation codes → a short label. Day/night only changes the
// icon (sun vs moon), not the label.
function describe(code: number): { label: string; base: WeatherIcon } {
  if (code === 0) return { label: "Clear", base: "clear-day" };
  if (code === 1 || code === 2) return { label: "Partly cloudy", base: "partly-day" };
  if (code === 3) return { label: "Overcast", base: "cloudy" };
  if (code === 45 || code === 48) return { label: "Fog", base: "fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", base: "drizzle" };
  if (code >= 61 && code <= 67) return { label: "Rain", base: "rain" };
  if (code >= 71 && code <= 77) return { label: "Snow", base: "snow" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", base: "rain" };
  if (code === 85 || code === 86) return { label: "Snow showers", base: "snow" };
  if (code >= 95) return { label: "Thunderstorm", base: "thunder" };
  return { label: "Cloudy", base: "cloudy" };
}

function iconFor(code: number, isDay: boolean): WeatherIcon {
  const { base } = describe(code);
  if (!isDay) {
    if (base === "clear-day") return "clear-night";
    if (base === "partly-day") return "partly-night";
  }
  return base;
}

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  current?: {
    temperature_2m: number;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export async function getWeather(
  latitude: number,
  longitude: number
): Promise<Weather | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code,is_day,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "4",
  });

  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      // Cache for 15 min so page reloads don't refetch; weather moves slowly.
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenMeteoResponse;
    if (!data.current || !data.daily) return null;

    const d = data.daily;
    const days: WeatherDay[] = d.time.map((date, i) => {
      const { label, base } = describe(d.weather_code[i] ?? 0);
      return {
        date,
        icon: base,
        label,
        highF: Math.round(d.temperature_2m_max[i] ?? 0),
        lowF: Math.round(d.temperature_2m_min[i] ?? 0),
      };
    });

    const cur = data.current;
    const desc = describe(cur.weather_code);
    return {
      current: {
        tempF: Math.round(cur.temperature_2m),
        label: desc.label,
        icon: iconFor(cur.weather_code, cur.is_day === 1),
        windMph: Math.round(cur.wind_speed_10m),
        highF: days[0]?.highF ?? Math.round(cur.temperature_2m),
        lowF: days[0]?.lowF ?? Math.round(cur.temperature_2m),
      },
      days,
    };
  } catch {
    return null;
  }
}
