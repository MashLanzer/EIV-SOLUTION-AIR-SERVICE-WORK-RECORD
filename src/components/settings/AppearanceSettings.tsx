"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, Sparkles } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { SettingsCustomRow, SettingsRow } from "@/components/settings/SettingsList";
import { cn } from "@/lib/utils";

type ThemeChoice = "light" | "system" | "dark";

const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

// A tiny same-tab store over the two localStorage prefs the before-paint script
// reads. We use useSyncExternalStore (not an effect) so there's no hydration
// mismatch and no state-in-effect: SSR renders the defaults, then the client
// snapshot takes over. `emit` fans out our own writes (the native `storage`
// event only fires for *other* tabs).
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

function setThemePref(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") {
    root.removeAttribute("data-theme");
    localStorage.removeItem("theme");
  } else {
    root.setAttribute("data-theme", choice);
    localStorage.setItem("theme", choice);
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
      return t === "dark" || t === "light" ? t : "system";
    },
    () => "system"
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
  const theme = useThemeChoice();
  const reduceMotion = useReduceMotion();

  return (
    <>
      <SettingsCustomRow className="flex flex-col gap-2.5">
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Theme
        </span>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid grid-cols-3 gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1"
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
                onClick={() => setThemePref(opt.value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                )}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          System follows your phone&apos;s light or dark setting.
        </p>
      </SettingsCustomRow>

      <SettingsRow
        icon={Sparkles}
        label="Reduce motion"
        sublabel="Turn off entrance and tap animations"
        trailing={
          <Switch
            checked={reduceMotion}
            onCheckedChange={setReduceMotionPref}
            aria-label="Reduce motion"
          />
        }
      />
    </>
  );
}
