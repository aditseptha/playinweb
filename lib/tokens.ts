// Design system tokens: the one source for colours, type, shape, motion and layering.
// `npm run tokens` turns this file into app/tokens.css (CSS variables prefixed --pw-*
// plus the Tailwind @theme mapping). The DS page and the contrast test read it directly.
// Values match the UI V2 homepage, so moving the homepage onto these tokens changes nothing.

/** Raw palette. Theme-independent; semantic tokens below pick from it. */
export const primitives = {
  // Blue ramp from the brand palette.
  navy: "#031654",
  deep: "#0435bb",
  blue: "#0658d7",
  primary: "#0871ed",
  bright: "#0a84ff",
  sky: "#7bc3ff",
  // The one warm accent.
  gold: "#ffb641",
  "gold-soft": "#ffc42b",
  "gold-deep": "#a35f00",
  "gold-ink": "#2a1a00",
  orange: "#ffb02f",
  "orange-hot": "#ff7d45",
  // Dark surfaces: near-black with a blue cast (not green-black).
  "night-950": "#02060e",
  "night-900": "#050d18",
  "night-800": "#08141c",
  "night-700": "#0a1722",
  "night-600": "#0c1a26",
  "night-500": "#132535",
  "night-400": "#1c3046",
  "night-300": "#2a4258",
  // Light text for dark surfaces.
  "mist-50": "#f2f7ff",
  "mist-100": "#c9d8ea",
  "mist-200": "#b5c6da",
  "mist-300": "#93a7bd",
  "mist-400": "#5f758b",
  // Light surfaces.
  "day-0": "#f6faff",
  "day-50": "#f4f8fd",
  "day-100": "#eef4fb",
  "day-200": "#e1ebf6",
  "day-300": "#eaf1fa",
  // Dark text for light surfaces (navy family).
  "ink-700": "#22406c",
  "ink-600": "#33507b",
  "ink-500": "#4a6283",
  "ink-400": "#7a90ab",
  white: "#ffffff",
  // Status.
  "red-300": "#ff8a8a",
  "red-700": "#b42318",
  "green-300": "#4ade9a",
  "green-700": "#11724a",
  "yellow-300": "#ffd166",
  "yellow-700": "#8a5300",
} as const;

/** Creator avatar pastels (initials fallback). Text on them is navy. */
export const pastels = ["#f6c8a6", "#9eb8ff", "#ffb43a", "#c9adff", "#8ee3b4", "#ff8f9e"] as const;

const p = primitives;

type ColorTokens = Record<string, string>;

/** Semantic colours. Names are what components use; never reach for a primitive in UI code. */
export const themes: { dark: ColorTokens; light: ColorTokens } = {
  dark: {
    bg: p["night-900"],
    "bg-deep": p["night-950"],
    "surface-1": p["night-700"],
    "surface-2": p["night-600"],
    "surface-3": p["night-500"],
    "surface-raised": p["night-800"],
    line: "rgba(123, 195, 255, 0.1)",
    "line-strong": "rgba(123, 195, 255, 0.2)",
    "line-box": p["night-300"],
    text: p["mist-50"],
    "text-soft": p["mist-100"],
    muted: p["mist-300"],
    faint: p["mist-400"],
    link: p.bright,
    primary: p.primary,
    "primary-hi": p.bright,
    "primary-lo": p.blue,
    "on-primary": p.white,
    highlight: p.gold,
    "highlight-ink": p.gold,
    "on-highlight": p["gold-ink"],
    danger: p["red-300"],
    success: p["green-300"],
    warning: p["yellow-300"],
    "focus-ring": p.bright,
    overlay: "rgba(3, 8, 18, 0.72)",
    "on-art": p["mist-50"],
    "on-art-soft": p["mist-100"],
    "chart-1": p.bright,
    "chart-2": p.sky,
    "chart-3": p.gold,
    "chart-4": p["orange-hot"],
    "chart-5": p["green-300"],
  },
  light: {
    bg: p["day-50"],
    "bg-deep": p["day-300"],
    "surface-1": p["day-100"],
    "surface-2": p["day-50"],
    "surface-3": p["day-200"],
    "surface-raised": p["day-0"],
    line: "rgba(3, 22, 84, 0.1)",
    "line-strong": "rgba(3, 22, 84, 0.18)",
    "line-box": "#b6c8dc",
    text: p.navy,
    "text-soft": p["ink-700"],
    muted: p["ink-500"],
    faint: p["ink-400"],
    // #0a84ff is 3.6:1 on white; the deeper blue reads at 6.2:1.
    link: p.blue,
    primary: p.primary,
    "primary-hi": p.bright,
    "primary-lo": p.blue,
    "on-primary": p.white,
    highlight: p.gold,
    "highlight-ink": p["gold-deep"],
    "on-highlight": p["gold-ink"],
    danger: p["red-700"],
    success: p["green-700"],
    warning: p["yellow-700"],
    "focus-ring": p.blue,
    overlay: "rgba(3, 22, 84, 0.45)",
    "on-art": p["mist-50"],
    "on-art-soft": p["mist-100"],
    "chart-1": p.blue,
    "chart-2": p.primary,
    "chart-3": p["gold-deep"],
    "chart-4": p["orange-hot"],
    "chart-5": p["green-700"],
  },
};

/**
 * Type roles. The faces come from next/font variables (app/fonts.ts). These stacks are declared on
 * .pw-fonts, the element that carries those variables, so var() resolves there and not on :root.
 */
export const fonts = {
  body: "var(--pw-font-body-face), ui-sans-serif, system-ui, sans-serif",
  display: "var(--pw-font-display-face), ui-sans-serif, system-ui, sans-serif",
  pixel: "var(--pw-font-pixel-face), ui-monospace, monospace",
} as const;

/** [size, line-height]. Display sizes scale with the viewport between a floor and a ceiling. */
export const typeScale = {
  "display-xl": ["clamp(40px, 4.4vw, 72px)", "0.95"],
  "display-l": ["clamp(32px, 3vw, 48px)", "1"],
  "display-m": ["clamp(26px, 2.3vw, 34px)", "0.98"],
  heading: ["24px", "1.2"],
  title: ["19px", "1.25"],
  body: ["15px", "1.5"],
  "body-sm": ["13.5px", "1.5"],
  caption: ["12.5px", "1.4"],
  label: ["11px", "1.2"],
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "22px",
  "2xl": "28px",
  pill: "999px",
} as const;

export const shadows = {
  dark: {
    1: "0 2px 8px rgba(0, 10, 24, 0.35)",
    2: "0 10px 30px rgba(0, 10, 24, 0.55)",
    3: "0 26px 60px rgba(0, 10, 24, 0.7)",
    glow: "0 8px 20px rgba(8, 113, 237, 0.35)",
  },
  light: {
    1: "0 2px 8px rgba(3, 22, 84, 0.06)",
    2: "0 10px 30px rgba(3, 22, 84, 0.1)",
    3: "0 26px 60px rgba(3, 22, 84, 0.16)",
    glow: "0 8px 20px rgba(8, 113, 237, 0.25)",
  },
} as const;

export const motion = {
  "ease-out": "cubic-bezier(0.2, 0.7, 0.2, 1)",
  "ease-spring": "cubic-bezier(0.3, 1.6, 0.5, 1)",
  "duration-fast": "150ms",
  "duration-base": "250ms",
  "duration-slow": "450ms",
} as const;

export const zIndex = {
  nav: "20",
  dropdown: "40",
  sheet: "60",
  dialog: "80",
  toast: "90",
  tooltip: "95",
} as const;

/** Text/background pairs that must pass, with their minimum ratio (WCAG 2.2 AA). */
export const contrastPairs: Array<{ fg: string; bg: string; min: number; note: string }> = [
  { fg: "text", bg: "bg", min: 4.5, note: "Body text" },
  { fg: "text", bg: "surface-1", min: 4.5, note: "Text on cards" },
  { fg: "text", bg: "surface-3", min: 4.5, note: "Text on raised fills" },
  { fg: "text-soft", bg: "bg", min: 4.5, note: "Secondary text" },
  { fg: "muted", bg: "bg", min: 4.5, note: "Meta text" },
  { fg: "muted", bg: "surface-2", min: 4.5, note: "Meta text on cards" },
  { fg: "link", bg: "bg", min: 4.5, note: "Links" },
  { fg: "link", bg: "surface-1", min: 4.5, note: "Links on cards" },
  { fg: "on-primary", bg: "primary", min: 4.5, note: "Primary button label" },
  { fg: "highlight-ink", bg: "bg", min: 4.5, note: "Gold text" },
  { fg: "on-highlight", bg: "highlight", min: 4.5, note: "Text on gold badges" },
  { fg: "danger", bg: "bg", min: 4.5, note: "Error text" },
  { fg: "danger", bg: "surface-1", min: 4.5, note: "Error text in forms" },
  { fg: "success", bg: "bg", min: 4.5, note: "Success text" },
  { fg: "warning", bg: "bg", min: 4.5, note: "Warning text" },
  { fg: "faint", bg: "bg", min: 3, note: "Placeholders and hints (large or non-essential)" },
  { fg: "focus-ring", bg: "bg", min: 3, note: "Focus ring" },
  { fg: "line-box", bg: "bg", min: 1.4, note: "Input borders (paired with fill)" },
];

// ---------- colour maths (shared by the test and the DS page) ----------

function channel(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Parses #rgb, #rrggbb or rgb()/rgba(). Alpha is ignored. */
export function parseColor(value: string): [number, number, number] | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

export function luminance(value: string) {
  const c = parseColor(value);
  if (!c) return null;
  return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
}

/** WCAG contrast ratio between two opaque colours, or null if either can't be parsed. */
export function contrast(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------- CSS output ----------

function block(selector: string, vars: Record<string, string>) {
  const lines = Object.entries(vars).map(([k, v]) => `  --pw-${k}: ${v};`);
  return `${selector} {\n${lines.join("\n")}\n}`;
}

/** The full contents of app/tokens.css. */
export function tokensCss() {
  const shared: Record<string, string> = {};
  for (const [k, v] of Object.entries(primitives)) shared[k] = v;
  pastels.forEach((v, i) => (shared[`pastel-${i + 1}`] = v));
  for (const [k, [size, lh]] of Object.entries(typeScale)) {
    shared[`text-${k}`] = size;
    shared[`leading-${k}`] = lh;
  }
  for (const [k, v] of Object.entries(radius)) shared[`radius-${k}`] = v;
  for (const [k, v] of Object.entries(motion)) shared[k] = v;
  for (const [k, v] of Object.entries(zIndex)) shared[`z-${k}`] = v;

  const themed = (name: "dark" | "light") => {
    const vars: Record<string, string> = { ...themes[name] };
    for (const [k, v] of Object.entries(shadows[name])) vars[`shadow-${k}`] = v;
    return vars;
  };

  const theme: string[] = [];
  for (const k of Object.keys(themes.dark)) theme.push(`  --color-pw-${k}: var(--pw-${k});`);
  for (const k of Object.keys(primitives)) theme.push(`  --color-pw-${k}: var(--pw-${k});`);
  pastels.forEach((_, i) => theme.push(`  --color-pw-pastel-${i + 1}: var(--pw-pastel-${i + 1});`));
  for (const k of Object.keys(fonts)) theme.push(`  --font-pw-${k}: var(--pw-font-${k});`);
  for (const k of Object.keys(typeScale)) {
    theme.push(`  --text-pw-${k}: var(--pw-text-${k});`);
    theme.push(`  --text-pw-${k}--line-height: var(--pw-leading-${k});`);
  }
  for (const k of Object.keys(radius)) theme.push(`  --radius-pw-${k}: var(--pw-radius-${k});`);
  for (const k of Object.keys(shadows.dark)) theme.push(`  --shadow-pw-${k}: var(--pw-shadow-${k});`);
  theme.push(`  --ease-pw-out: var(--pw-ease-out);`);
  theme.push(`  --ease-pw-spring: var(--pw-ease-spring);`);

  return [
    "/* Generated by scripts/build-tokens.mjs from lib/tokens.ts. Do not edit by hand: run `npm run tokens`. */",
    "",
    "/* Dark is the default. The theme classes work on any element, so a section can preview the other theme. */",
    block(":root, .dark", { ...shared, ...themed("dark") }),
    "",
    block(".light", themed("light")),
    "",
    "/* Font stacks resolve where next/font sets the faces (app/fonts.ts adds .pw-fonts next to them). */",
    block(".pw-fonts", Object.fromEntries(Object.entries(fonts).map(([k, v]) => [`font-${k}`, v]))),
    "",
    "/* Tailwind utilities: bg-pw-surface-1, text-pw-muted, text-pw-body, rounded-pw-lg, shadow-pw-2, font-pw-display … */",
    "@theme inline {",
    ...theme,
    "}",
    "",
  ].join("\n");
}
