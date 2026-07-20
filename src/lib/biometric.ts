"use client";

import { useSyncExternalStore } from "react";

// Biometric app-lock (Touch ID / Face ID / Android biometric / Windows Hello).
//
// This is an APP-LOCK, not server authentication: it gates local access to an
// already-authenticated session on this device. When enabled, the app shows a
// lock screen on open that the device's platform authenticator (WebAuthn,
// userVerification "required") must satisfy before the UI is revealed. The
// security boundary is the device biometric protecting the signed-in session on
// that device — exactly how a banking app's app-lock works. It adds no server
// trust and degrades gracefully where no platform authenticator exists.

const ENABLED_KEY = "biometric-lock"; // "1" when the lock is on
const CRED_KEY = "biometric-cred"; // registered credential id (base64url)
const UNLOCKED_KEY = "biometric-unlocked"; // sessionStorage: "1" once unlocked this session

// ---- base64url (pure, testable) -------------------------------------------

export function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const s = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s + pad);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Whether the app should sit locked right now (pure — drives the overlay).
export function shouldLock(enabled: boolean, unlocked: boolean): boolean {
  return enabled && !unlocked;
}

// ---- store -----------------------------------------------------------------

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

export function useBiometricEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(ENABLED_KEY) === "1",
    () => false
  );
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCKED_KEY) === "1";
  } catch {
    return true; // no sessionStorage → don't trap the user behind a lock
  }
}

// Reactive per-session unlocked flag. Server + first client render report true
// so the lock never flashes during hydration; a real check follows on the
// client and re-renders through the store.
export function useUnlocked(): boolean {
  return useSyncExternalStore(subscribe, isUnlocked, () => true);
}

function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, "1");
  } catch {
    /* ignore */
  }
  emit();
}

// ---- platform support ------------------------------------------------------

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(new ArrayBuffer(n));
  crypto.getRandomValues(b);
  return b;
}

// ---- enable / disable / unlock --------------------------------------------

// Register a platform credential and turn the lock on. Returns false (and
// changes nothing) if the device declines or has no authenticator.
export async function enableBiometric(userLabel: string): Promise<boolean> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: "AeroTrack", id: window.location.hostname },
        user: { id: randomBytes(16), name: userLabel, displayName: userLabel },
        // ES256 + RS256 cover essentially every platform authenticator.
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    const id = toBase64Url(new Uint8Array(cred.rawId));
    localStorage.setItem(CRED_KEY, id);
    localStorage.setItem(ENABLED_KEY, "1");
    markUnlocked();
    return true;
  } catch {
    return false;
  }
}

export function disableBiometric() {
  localStorage.removeItem(ENABLED_KEY);
  localStorage.removeItem(CRED_KEY);
  emit();
}

// Prompt the device biometric to lift the lock for this session.
export async function unlock(): Promise<boolean> {
  const credId = localStorage.getItem(CRED_KEY);
  if (!credId) {
    // Enabled with no credential (shouldn't happen) — don't trap the user.
    markUnlocked();
    return true;
  }
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ type: "public-key", id: fromBase64Url(credId) }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    if (!assertion) return false;
    markUnlocked();
    return true;
  } catch {
    return false;
  }
}
