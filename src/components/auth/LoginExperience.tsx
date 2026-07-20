"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { AeroWordmark } from "@/components/brand/AeroWordmark";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/LocaleProvider";

// Remembered per device: once the intro has played, later opens go straight to
// the sign-in step. Cleared only if the user wipes app data.
const WELCOMED_KEY = "aerotrack:welcomed";

// The "Ambiente de obra" (jobsite dusk) sign-in, with a one-time animated
// welcome shown on the very first open. Auth is unchanged — Google is the only
// action. The dusk scene is a deliberate single (dark) look, so it doesn't
// follow the app's light/dark theme.
export function LoginExperience({
  startOnSignIn = false,
  showError = false,
}: {
  startOnSignIn?: boolean;
  showError?: boolean;
}) {
  const t = useT().auth;
  // "init" avoids a welcome→signin flash before we can read localStorage.
  const [phase, setPhase] = useState<"init" | "welcome" | "signin">("init");

  useEffect(() => {
    let welcomed = false;
    try {
      welcomed = localStorage.getItem(WELCOMED_KEY) === "1";
    } catch {
      welcomed = false;
    }
    // Intentional: the welcome-once flag lives in localStorage, only readable
    // after mount (this renders during SSR too, so a lazy initializer can't).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase(welcomed || startOnSignIn ? "signin" : "welcome");
  }, [startOnSignIn]);

  function finishWelcome() {
    try {
      localStorage.setItem(WELCOMED_KEY, "1");
    } catch {
      /* private mode — just move on */
    }
    setPhase("signin");
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#060809] text-[#eafcf8]">
      {/* Dusk scene: sky gradient, teal glow, and a jobsite horizon silhouette. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg,#0a2a2c 0%,#0b1518 46%,#060809 100%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(30,200,182,.45), transparent 66%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[28%] h-[44%]"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(0,0,0,.7))",
          clipPath:
            "polygon(0 60%,18% 40%,34% 55%,52% 30%,72% 52%,88% 38%,100% 55%,100% 100%,0 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10">
        {phase === "welcome" && <WelcomeIntro onDone={finishWelcome} lead={t.welcomeLead} cta={t.getStarted} />}
        {phase === "signin" && (
          <SignInPanel
            title={t.welcomeTitle}
            prompt={t.signInPrompt}
            tagline={t.tagline}
            notAuthorized={t.notAuthorized}
            showError={showError}
          />
        )}
      </div>

      <style>{KEYFRAMES}</style>
    </div>
  );
}

function SignInPanel({
  title,
  prompt,
  tagline,
  notAuthorized,
  showError,
}: {
  title: string;
  prompt: string;
  tagline: string;
  notAuthorized: string;
  showError: boolean;
}) {
  return (
    <div className="flex w-full max-w-sm animate-fade-up flex-col items-center gap-6 text-center">
      <AeroLogo className="h-16 w-16" />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto max-w-[26ch] text-sm text-[#a7d8d0]">{prompt}</p>
      </div>

      <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-md">
        {showError && (
          <Alert variant="error" className="text-sm">
            {notAuthorized}
          </Alert>
        )}
        <GoogleSignInButton className="border-0 bg-white text-neutral-900 shadow-sm hover:bg-white/90" />
      </div>

      <p className="text-xs text-[#8fb8b1]">{tagline}</p>
    </div>
  );
}

function WelcomeIntro({ onDone, lead, cta }: { onDone: () => void; lead: string; cta: string }) {
  const [showCta, setShowCta] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const delay = reduce ? 300 : 2400;
    const id = setTimeout(() => setShowCta(true), delay);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-7 text-center">
      <AeroLogo className="h-28 w-28" animate />
      <div className="flex flex-col items-center gap-2">
        <div className="lx-fade text-3xl font-bold tracking-tight" style={{ animationDelay: "1.15s" }}>
          <AeroWordmark />
        </div>
        <p
          className="lx-fade mx-auto max-w-[28ch] text-sm text-[#a7d8d0]"
          style={{ animationDelay: "1.45s" }}
        >
          {lead}
        </p>
      </div>

      <div className="h-12">
        {showCta && (
          <Button
            type="button"
            size="lg"
            onClick={onDone}
            className="animate-fade-up border-0 bg-white px-8 text-neutral-900 shadow-sm hover:bg-white/90"
          >
            {cta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// The AeroTrack mark (bold A + teal swoosh + speed lines). With `animate`, the
// strokes draw themselves in on first paint; the teal swoosh lands last.
function AeroLogo({ className, animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} role="img" aria-label="AeroTrack">
      <g stroke="#eafcf8" strokeWidth="4.2" strokeLinecap="round">
        <line x1="3" y1="20" x2="13" y2="20" className={animate ? "lx-line" : undefined} style={animate ? { animationDelay: "0.05s" } : undefined} />
        <line x1="1" y1="28" x2="11" y2="28" className={animate ? "lx-line" : undefined} style={animate ? { animationDelay: "0.18s" } : undefined} />
        <line x1="4" y1="36" x2="12" y2="36" className={animate ? "lx-line" : undefined} style={animate ? { animationDelay: "0.31s" } : undefined} />
      </g>
      <path
        d="M14 40 L24 9 L34 40"
        stroke="#eafcf8"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={animate ? "lx-draw" : undefined}
        style={animate ? { animationDelay: "0.4s" } : undefined}
      />
      <path
        d="M11 29 L21 37 L40 11"
        stroke="#1ec8b6"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={animate ? "lx-draw" : undefined}
        style={animate ? { animationDelay: "0.95s" } : undefined}
      />
    </svg>
  );
}

const KEYFRAMES = `
@keyframes lx-draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
@keyframes lx-line { from { opacity: 0; transform: translateX(-6px) } to { opacity: 1; transform: none } }
@keyframes lx-fade { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
.lx-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: lx-draw .75s ease forwards; }
.lx-line { opacity: 0; animation: lx-line .5s ease forwards; }
.lx-fade { opacity: 0; animation: lx-fade .6s ease forwards; }
@media (prefers-reduced-motion: reduce) {
  .lx-draw, .lx-line, .lx-fade { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; transform: none !important; }
}
`;
