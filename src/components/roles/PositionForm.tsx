"use client";

import { useState } from "react";
import { Check, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale, useT } from "@/components/i18n/LocaleProvider";
import { createPositionAction, updatePositionAction } from "@/actions/positions";
import {
  GROUP_LABELS,
  PERMISSIONS,
  PERMISSION_GROUPS,
  type AccessLevel,
} from "@/lib/permissions";
import { TEAM_COLORS } from "@/lib/teamColors";
import { cn } from "@/lib/utils";

interface PositionValues {
  name: string;
  color: string | null;
  accessLevel: AccessLevel;
  permissions: string[];
}

export function PositionForm({
  positionId,
  isSystem = false,
  defaultValues,
}: {
  positionId?: string;
  isSystem?: boolean;
  defaultValues?: PositionValues;
}) {
  const t = useT().roles;
  const lang = useLocale();
  const label = (o: { en: string; es: string }) => (lang === "es" ? o.es : o.en);

  const action = positionId
    ? updatePositionAction.bind(null, positionId)
    : createPositionAction;

  const [color, setColor] = useState<string>(defaultValues?.color ?? "");
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(
    defaultValues?.accessLevel ?? "ADMIN"
  );
  // Controlled permission set, so "select all / clear" and a live count work.
  const [granted, setGranted] = useState<Set<string>>(
    () => new Set(defaultValues?.permissions ?? [])
  );
  const allKeys = PERMISSIONS.map((p) => p.key);

  const toggle = (key: string) =>
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const setKeys = (keys: string[], on: boolean) =>
    setGranted((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" required>
          {t.name}
        </Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={60}
          defaultValue={defaultValues?.name}
          placeholder={t.namePlaceholder}
        />
      </div>

      {/* Which app (locked for the built-in roles). */}
      <div className="flex flex-col gap-2">
        <Label>{t.accessLevel}</Label>
        <input type="hidden" name="accessLevel" value={accessLevel} />
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1">
          {(["ADMIN", "WORKER"] as const).map((lvl) => {
            const active = accessLevel === lvl;
            return (
              <button
                key={lvl}
                type="button"
                disabled={isSystem}
                onClick={() => setAccessLevel(lvl)}
                aria-pressed={active}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  active
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400"
                )}
              >
                {lvl === "ADMIN" ? t.accessOffice : t.accessField}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.accessHint}</p>
      </div>

      {/* Color */}
      <div className="flex flex-col gap-2">
        <Label>{t.color}</Label>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {TEAM_COLORS.map((c) => {
            const selected = c.key === color;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setColor(selected ? "" : c.key)}
                aria-label={c.label}
                aria-pressed={selected}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-105",
                  c.dot,
                  selected &&
                    "ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100 ring-offset-white dark:ring-offset-neutral-900"
                )}
              >
                {selected && <Check className="h-4 w-4 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Permissions, grouped */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Label>{t.permissions}</Label>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.permissionsHint}</p>
          </div>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {granted.size}/{allKeys.length}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setKeys(allKeys, true)}
            disabled={granted.size === allKeys.length}
          >
            {t.grantAll}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setKeys(allKeys, false)}
            disabled={granted.size === 0}
          >
            {t.clearAll}
          </Button>
        </div>
        {PERMISSION_GROUPS.map((group) => {
          const perms = PERMISSIONS.filter((p) => p.group === group);
          const keys = perms.map((p) => p.key);
          const selected = keys.filter((k) => granted.has(k)).length;
          const allOn = selected === keys.length;
          return (
            <div key={group} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                  {label(GROUP_LABELS[group])}
                  <span className="tabular-nums text-neutral-300 dark:text-neutral-600">
                    {selected}/{keys.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setKeys(keys, !allOn)}
                  className="text-xs font-medium text-neutral-500 hover:text-primary dark:text-neutral-400"
                >
                  {allOn ? t.groupNone : t.groupAll}
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {perms.map((p) => {
                  const on = granted.has(p.key);
                  return (
                    <label
                      key={p.key}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                        on
                          ? "border-primary bg-accent-soft"
                          : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
                      )}
                    >
                      <input
                        type="checkbox"
                        name="perm"
                        value={p.key}
                        checked={on}
                        onChange={() => toggle(p.key)}
                        className="peer sr-only"
                      />
                      <span className="min-w-0 flex-1 text-sm text-neutral-800 dark:text-neutral-200">
                        {label(p)}
                      </span>
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                          on ? "border-primary bg-primary" : "border-neutral-300 dark:border-neutral-600"
                        )}
                      >
                        <Check
                          className={cn(
                            "h-3.5 w-3.5 text-primary-foreground transition-opacity",
                            on ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Button type="submit" className="w-full">
        <Save className="h-4 w-4" />
        {positionId ? t.saveRole : t.createRole}
      </Button>
    </form>
  );
}
