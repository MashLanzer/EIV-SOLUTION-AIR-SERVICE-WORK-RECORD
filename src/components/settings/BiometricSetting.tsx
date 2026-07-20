"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { SettingsRow } from "@/components/settings/SettingsList";
import { useT } from "@/components/i18n/LocaleProvider";
import {
  disableBiometric,
  enableBiometric,
  isBiometricSupported,
  useBiometricEnabled,
} from "@/lib/biometric";

// The biometric app-lock toggle. Hidden entirely on devices with no platform
// authenticator; enabling it registers a device credential (failure reverts).
export function BiometricSetting() {
  const t = useT().biometric;
  const enabled = useBiometricEnabled();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void isBiometricSupported().then((ok) => {
      if (alive) setSupported(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (supported === false) return null;

  async function toggle(on: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (on) await enableBiometric("AeroTrack");
      else disableBiometric();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsRow
      icon={Fingerprint}
      label={t.settingLabel}
      sublabel={t.settingHint}
      trailing={
        <Switch
          checked={enabled}
          disabled={busy || supported === null}
          onCheckedChange={toggle}
          aria-label={t.settingLabel}
        />
      }
    />
  );
}
