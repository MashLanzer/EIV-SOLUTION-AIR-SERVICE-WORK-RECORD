// The interface is deliberately monochrome; a team's color is the one small
// accent we allow (like the brand teal on the logo). It gives crews an
// at-a-glance identity on project cards, team lists and the map legend.
//
// Each entry ships FULL literal class strings so Tailwind's scanner keeps them
// in the build — never build these names by string concatenation.

export interface TeamColor {
  key: string;
  label: string;
  dot: string; // solid swatch (the color "dot")
  chip: string; // soft pill background + readable text, light & dark
}

export const TEAM_COLORS: TeamColor[] = [
  {
    key: "slate",
    label: "Slate",
    dot: "bg-slate-500",
    chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  },
  {
    key: "blue",
    label: "Blue",
    dot: "bg-blue-500",
    chip: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    key: "emerald",
    label: "Emerald",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    key: "violet",
    label: "Violet",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    key: "amber",
    label: "Amber",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    key: "rose",
    label: "Rose",
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
  {
    key: "cyan",
    label: "Cyan",
    dot: "bg-cyan-500",
    chip: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  },
  {
    key: "orange",
    label: "Orange",
    dot: "bg-orange-500",
    chip: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  },
];

const BY_KEY = new Map(TEAM_COLORS.map((c) => [c.key, c]));

// Stable hash so a team with no stored color still gets a consistent swatch
// (seeded by its id) instead of flickering between renders.
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Resolve a team's color: prefer the stored key (once Teams gain one), else a
// deterministic fallback derived from the id.
export function teamColor(color: string | null | undefined, seed: string): TeamColor {
  if (color && BY_KEY.has(color)) return BY_KEY.get(color)!;
  return TEAM_COLORS[hash(seed) % TEAM_COLORS.length];
}
