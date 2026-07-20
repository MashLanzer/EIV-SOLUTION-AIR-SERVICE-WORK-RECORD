// Registry of selectable custom colour schemes (Appearance → Custom). Each
// entry pairs with a `:root[data-palette="<id>"]` block in globals.css. To add
// a palette: append an entry here and add its CSS block there — nothing else.
//
// `family` decides which base theme the palette rides on: "dark" sets
// data-theme="dark" (so the app's `dark:` styles + dark base tokens apply,
// then the palette block re-tints them), "light" sets data-theme="light".
export interface Palette {
  id: string;
  label: string;
  family: "light" | "dark";
  // Three representative swatch colours (dark → light) for the picker chip.
  swatch: [string, string, string];
}

export const PALETTES: Palette[] = [
  {
    id: "ocean",
    label: "Ocean",
    family: "dark",
    swatch: ["#001d39", "#0a4174", "#7bbde8"],
  },
  {
    id: "forest",
    label: "Forest",
    family: "dark",
    swatch: ["#07130d", "#164a30", "#6ee7a6"],
  },
  {
    id: "sunset",
    label: "Sunset",
    family: "dark",
    swatch: ["#1a0f0a", "#593524", "#fb923c"],
  },
  {
    id: "grape",
    label: "Grape",
    family: "dark",
    swatch: ["#130a1f", "#392558", "#c084fc"],
  },
  {
    id: "dusk",
    label: "Dusk",
    family: "dark",
    swatch: ["#06171a", "#164a44", "#2dd4bf"],
  },
];

// id → family map, small enough to inline into the before-paint script.
export const PALETTE_FAMILIES: Record<string, "light" | "dark"> =
  Object.fromEntries(PALETTES.map((p) => [p.id, p.family]));

export const DEFAULT_PALETTE_ID = PALETTES[0]?.id ?? "";
