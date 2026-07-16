"use client";

import { useSyncExternalStore } from "react";
import { Check, Map as MapIcon, Monitor, Moon, Sun, Palette as PaletteIcon, Sparkles, Thermometer } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { SettingsCustomRow, SettingsRow } from "@/components/settings/SettingsList";
import { LanguageSetting } from "@/components/settings/LanguageSetting";
import { useT } from "@/components/i18n/LocaleProvider";
import {
  DEFAULT_PALETTE_ID,
  PALETTES,
  PALETTE_FAMILIES,
} from "@/lib/palettes";
import { setTempUnit, useTempUnit, type TempUnit } from "@/lib/tempUnit";
import { setMapStyle, useMapStyle } from "@/lib/mapStyle";
import { cn } from "@/lib/utils";

const TEMP_UNIT_VALUES: TempUnit[] = ["F", "C"];
const TEMP_UNIT_LABELS: Record<TempUnit, string> = { F: "°F", C: "°C" };

type ThemeChoice = "light" | "system" | "dark" | "custom";

const THEME_OPTIONS: { value: ThemeChoice; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "system", icon: Monitor },
  { value: "dark", icon: Moon },
  { value: "custom", icon: PaletteIcon },
];

// A tiny same-tab store over the Appearance prefs the before-paint script reads
// (theme, palette, reduce-motion). useSyncExternalStore avoids hydration
// mismatch and state-in-effect; `emit` fans out our own writes.
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

// Apply light/dark/system/custom. Custom needs a palette id; its family decides
// which base theme (data-theme) it rides on, then data-palette re-tints.
function applyTheme(choice: ThemeChoice, paletteId?: string) {
  const root = document.documentElement;
  root.removeAttribute("data-palette");
  if (choice === "system") {
    root.removeAttribute("data-theme");
    localStorage.removeItem("theme");
    localStorage.removeItem("palette");
  } else if (choice === "light" || choice === "dark") {
    root.setAttribute("data-theme", choice);
    localStorage.setItem("theme", choice);
    localStorage.removeItem("palette");
  } else {
    const id = paletteId ?? DEFAULT_PALETTE_ID;
    const family = PALETTE_FAMILIES[id] ?? "dark";
    root.setAttribute("data-theme", family);
    root.setAttribute("data-palette", id);
    localStorage.setItem("theme", "custom");
    localStorage.setItem("palette", id);
  }
  emit();
}

function setReduceMotionPref(on: boolean) {
  const root = document.documentElement;
  if (on) {
    root.setAttribute("data-reduce-motion", "1");
    localStorage.setItem("reduce-motion", "1");
  } else {
    root.removeAttribute("data-reduce-motion");
    localStorage.removeItem("reduce-motion");
  }
  emit();
}

function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(
    subscribe,
    () => {
      const t = localStorage.getItem("theme");
      return t === "dark" || t === "light" || t === "custom" ? t : "system";
    },
    () => "system"
  );
}

function usePaletteId(): string {
  return useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("palette") || DEFAULT_PALETTE_ID,
    () => DEFAULT_PALETTE_ID
  );
}

function useReduceMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("reduce-motion") === "1",
    () => false
  );
}

export function AppearanceSettings() {
  const t = useT();
  const theme = useThemeChoice();
  const paletteId = usePaletteId();
  const reduceMotion = useReduceMotion();
  const tempUnit = useTempUnit();
  const mapStyle = useMapStyle();

  return (
    <>
      <SettingsCustomRow className="flex flex-col gap-2.5">
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {t.appearance.theme}
        </span>
        <div
          role="radiogroup"
          aria-label={t.appearance.theme}
          className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1"
        >
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => applyTheme(opt.value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.appearance[opt.value]}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t.appearance.systemHint}
        </p>
      </SettingsCustomRow>

      {theme === "custom" && (
        <SettingsCustomRow className="flex flex-col gap-2.5">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.appearance.palette}
          </span>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => {
              const active = paletteId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyTheme("custom", p.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary text-neutral-900 dark:text-neutral-100"
                      : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10"
                    style={{
                      background: `linear-gradient(135deg, ${p.swatch[0]} 0%, ${p.swatch[1]} 50%, ${p.swatch[2]} 100%)`,
                    }}
                  >
                    {active && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t.appearance.morePalettes}
          </p>
        </SettingsCustomRow>
      )}

      <SettingsRow
        icon={Sparkles}
        label={t.appearance.reduceMotion}
        sublabel={t.appearance.reduceMotionHint}
        trailing={
          <Switch
            checked={reduceMotion}
            onCheckedChange={setReduceMotionPref}
            aria-label={t.appearance.reduceMotion}
          />
        }
      />

      <SettingsRow
        icon={Thermometer}
        label={t.appearance.tempUnits}
        sublabel={t.appearance.tempUnitsHint}
        trailing={
          <div
            role="radiogroup"
            aria-label={t.appearance.tempUnits}
            className="flex rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-0.5"
          >
            {TEMP_UNIT_VALUES.map((value) => {
              const active = tempUnit === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTempUnit(value)}
                  className={cn(
                    "min-w-9 rounded-md px-2.5 py-1 text-sm font-medium tabular-nums transition-colors",
                    active
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  {TEMP_UNIT_LABELS[value]}
                </button>
              );
            })}
          </div>
        }
      />

      <SettingsRow
        icon={MapIcon}
        label={t.appearance.mapColor}
        sublabel={t.appearance.mapColorHint}
        trailing={
          <Switch
            checked={mapStyle === "color"}
            onCheckedChange={(on) => setMapStyle(on ? "color" : "mono")}
            aria-label={t.appearance.mapColor}
          />
        }
      />

      <LanguageSetting />
    </>
  );
}
