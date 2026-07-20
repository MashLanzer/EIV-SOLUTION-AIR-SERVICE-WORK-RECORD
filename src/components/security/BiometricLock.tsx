"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Fingerprint, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/LocaleProvider";
import { shouldLock, unlock, useBiometricEnabled, useUnlocked } from "@/lib/biometric";

// The full-screen lock shown on app open when the biometric app-lock is on.
// Renders nothing unless the lock is armed, so it's inert for everyone else.
export function BiometricLock() {
  const t = useT().biometric;
  const enabled = useBiometricEnabled();
  const unlocked = useUnlocked();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const locked = shouldLock(enabled, unlocked);

  const attempt = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    const ok = await unlock(); // marks the session unlocked on success (store re-renders)
    setBusy(false);
    if (!ok) setFailed(true);
  }, []);

  // Auto-prompt once when the lock first appears. Deferred to a timeout so the
  // effect body itself does no synchronous state work.
  useEffect(() => {
    if (!locked) return;
    const id = setTimeout(() => void attempt(), 0);
    return () => clearTimeout(id);
  }, [locked, attempt]);

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-white px-6 dark:bg-neutral-950">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          <LockKeyhole className="h-7 w-7" />
        </span>
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t.lockedTitle}</h1>
        <p className="max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
          {failed ? t.failed : t.lockedDesc}
        </p>
      </div>

      <Button type="button" size="lg" onClick={attempt} disabled={busy} className="w-full max-w-xs">
        <Fingerprint className="h-5 w-5" />
        {busy ? t.verifying : t.unlock}
      </Button>

      <button
        type="button"
        onClick={() => signOut({ redirectTo: "/login" })}
        className="text-sm font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        {t.signOutInstead}
      </button>
    </div>
  );
}
