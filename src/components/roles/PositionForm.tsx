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
  const granted = new Set(defaultValues?.permissions ?? []);

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
        <div>
          <Label>{t.permissions}</Label>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.permissionsHint}</p>
        </div>
        {PERMISSION_GROUPS.map((group) => {
          const perms = PERMISSIONS.filter((p) => p.group === group);
          return (
            <div key={group} className="flex flex-col gap-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                {label(GROUP_LABELS[group])}
              </div>
              <div className="flex flex-col gap-1.5">
                {perms.map((p) => (
                  <label
                    key={p.key}
                    className="group flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 has-[:checked]:border-primary has-[:checked]:bg-accent-soft"
                  >
                    <input
                      type="checkbox"
                      name="perm"
                      value={p.key}
                      defaultChecked={granted.has(p.key)}
                      className="peer sr-only"
                    />
                    <span className="min-w-0 flex-1 text-sm text-neutral-800 dark:text-neutral-200">
                      {label(p)}
                    </span>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-600 text-primary-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
                      <Check className="h-3.5 w-3.5 opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
                    </span>
                  </label>
                ))}
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
