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
  MapPin,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";

import type { WeatherDay, WeatherIcon } from "@/lib/weather";
import { toUnit, useTempUnit } from "@/lib/tempUnit";

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

// A one-line weather strip for the selected day at the day's first jobsite -
// enough for a dispatcher to see "rain that afternoon" without leaving the
// schedule. Only rendered when there's a geocoded jobsite and the day falls
// inside the forecast window (the page passes null otherwise).
export function ScheduleDayWeather({
  day,
  placeLabel,
}: {
  day: WeatherDay;
  placeLabel: string;
}) {
  const Icon = ICONS[day.icon];
  const unit = useTempUnit();
  const conv = (f: number) => toUnit(f, unit);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-3.5 py-2.5">
      <Icon className="h-6 w-6 shrink-0 text-neutral-700 dark:text-neutral-200" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {conv(day.highF)}° <span className="text-neutral-400 dark:text-neutral-500">/ {conv(day.lowF)}°{unit}</span>
          </span>
          <span className="truncate text-sm text-neutral-500 dark:text-neutral-400">{day.label}</span>
        </div>
        <span className="flex items-center gap-1 truncate text-xs text-neutral-400 dark:text-neutral-500">
          <MapPin className="h-3 w-3 shrink-0" />
          {placeLabel}
        </span>
      </div>
    </div>
  );
}
