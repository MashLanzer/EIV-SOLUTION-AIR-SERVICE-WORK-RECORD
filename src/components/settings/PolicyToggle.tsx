"use client";

import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { SettingsRow } from "@/components/settings/SettingsList";

// A boolean company policy shown as a settings row with a switch. Optimistic:
// it flips instantly and the server action confirms (its revalidate keeps it
// in sync). Backs the require-photo and lock-approved-records policies.
export function PolicyToggle({
  icon,
  label,
  sublabel,
  initial,
  action,
  ariaLabel,
}: {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  initial: boolean;
  action: (enabled: boolean) => Promise<void>;
  ariaLabel?: string;
}) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setOn(next);
    startTransition(async () => {
      await action(next);
    });
  }

  return (
    <SettingsRow
      icon={icon}
      label={label}
      sublabel={sublabel}
      trailing={
        <Switch
          checked={on}
          onCheckedChange={toggle}
          disabled={pending}
          aria-label={ariaLabel ?? label}
        />
      }
    />
  );
}
