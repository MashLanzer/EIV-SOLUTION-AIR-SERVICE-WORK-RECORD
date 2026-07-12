"use client";

import { useState, useTransition } from "react";
import { Camera } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { SettingsRow } from "@/components/settings/SettingsList";
import { setRequirePhotoAction } from "@/actions/organization";

// Admin policy toggle: whether a work record needs at least one photo before it
// can be submitted. Optimistic — flips instantly, the server confirms; the
// revalidate keeps it in sync.
export function RequirePhotoToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setOn(next);
    startTransition(async () => {
      await setRequirePhotoAction(next);
    });
  }

  return (
    <SettingsRow
      icon={Camera}
      label="Require a photo"
      sublabel="Records can't be submitted without at least one photo"
      trailing={
        <Switch
          checked={on}
          onCheckedChange={toggle}
          disabled={pending}
          aria-label="Require a photo to submit a record"
        />
      }
    />
  );
}
