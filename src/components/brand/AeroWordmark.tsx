import { cn } from "@/lib/utils";

// "AeroTrack" wordmark: "Aero" in the inherited ink color, "Track" in brand
// teal. Bold and tight to read as a designed logotype.
export function AeroWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight", className)}>
      Aero
      <span style={{ color: "var(--brand-teal)" }}>Track</span>
    </span>
  );
}
