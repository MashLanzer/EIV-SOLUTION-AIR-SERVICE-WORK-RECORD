// AeroTrack icon mark: a bold "A" (currentColor, so it flips near-black on
// light / near-white on dark) crossed by a fixed-teal check/swoosh, with three
// speed lines to the left. Approximation of the brand logo.
export function AeroMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="AeroTrack"
    >
      {/* speed lines */}
      <g stroke="currentColor" strokeWidth="4.2" strokeLinecap="round">
        <line x1="3" y1="20" x2="13" y2="20" />
        <line x1="1" y1="28" x2="11" y2="28" />
        <line x1="4" y1="36" x2="12" y2="36" />
      </g>
      {/* the "A" */}
      <path
        d="M14 40 L24 9 L34 40"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* teal check / swoosh crossing the A */}
      <path
        d="M11 29 L21 37 L40 11"
        stroke="var(--brand-teal)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
