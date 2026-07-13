"use client";

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";

import type { Weather, WeatherIcon } from "@/lib/weather";
import { toUnit, useTempUnit } from "@/lib/tempUnit";
import { useLocale } from "@/components/i18n/LocaleProvider";

const ICONS: Record<WeatherIcon, LucideIcon> = {
  "clear-day": Sun,
  "clear-night": Moon,
  "partly-day": CloudSun,
  "partly-night": CloudMoon,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: CloudLightning,
};

// Current jobsite conditions plus a short forecast, so a tech or admin can see
// at a glance whether the weather suits the visit. Hidden entirely when the
// forecast can't be fetched (getWeather returns null).
export function WeatherCard({ weather }: { weather: Weather }) {
  const CurrentIcon = ICONS[weather.current.icon];
  const forecast = weather.days.slice(1, 4);
  const unit = useTempUnit();
  const locale = useLocale();
  const t = (f: number) => toUnit(f, unit);
  const weekdayFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    weekday: "short",
  });
  const weekday = (date: string) =>
    // Parse as local midnight so the weekday isn't shifted by timezone.
    weekdayFmt.format(new Date(`${date}T00:00:00`));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
      <div className="flex items-center gap-3">
        <CurrentIcon className="h-9 w-9 shrink-0 text-neutral-700 dark:text-neutral-200" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {t(weather.current.tempF)}°{unit}
            </span>
            <span className="truncate text-sm text-neutral-500 dark:text-neutral-400">
              {weather.current.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
            <span>
              H:{t(weather.current.highF)}° L:{t(weather.current.lowF)}°
            </span>
            <span className="inline-flex items-center gap-1">
              <Wind className="h-3 w-3" />
              {weather.current.windMph} mph
            </span>
          </div>
        </div>
      </div>

      {forecast.length > 0 && (
        <div className="grid grid-cols-3 gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
          {forecast.map((day) => {
            const Icon = ICONS[day.icon];
            return (
              <div key={day.date} className="flex flex-col items-center gap-1 text-center">
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {weekday(day.date)}
                </span>
                <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" strokeWidth={1.75} />
                <span className="text-xs tabular-nums text-neutral-900 dark:text-neutral-100">
                  {t(day.highF)}°
                  <span className="text-neutral-400 dark:text-neutral-500"> {t(day.lowF)}°</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        Weather · Open-Meteo
      </p>
    </div>
  );
}
