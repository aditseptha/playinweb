// Badge metal colours (#30), shared by the three.js renderer and the flat SVG fallback.
// They are the badge artwork itself (polished bronze, silver, gold, Foil film), not UI colours,
// so they live here rather than in the design tokens.
import type { BadgeTier } from "./badges.ts";

export type BadgePalette = {
  /** Hard studio highlight. */
  hi: string;
  light: string;
  /** The metal's own colour, seen on faces that point at the viewer. */
  base: string;
  deep: string;
  /** Coloured light bounced onto the lower rim. */
  bounce: string;
  /** Glow and neon edge, as a three.js hex number. */
  glow: number;
};

export const BADGE_PALETTES: Record<BadgeTier, BadgePalette> = {
  bronze: { hi: "#fff1e2", light: "#f6b585", base: "#c8743c", deep: "#3a1606", bounce: "#ffb27a", glow: 0xff8a3d },
  silver: { hi: "#ffffff", light: "#eef3fa", base: "#9eadc0", deep: "#1d2632", bounce: "#cfe4ff", glow: 0xa9d2ff },
  gold: { hi: "#fffbe8", light: "#ffd86a", base: "#e09218", deep: "#4a2400", bounce: "#ffc04d", glow: 0xffb641 },
  foil: { hi: "#ffffff", light: "#f4ecff", base: "#a98be0", deep: "#1a1030", bounce: "#d9c6ff", glow: 0xc9adff },
  locked: { hi: "#5f758b", light: "#2a4258", base: "#1a2b3c", deep: "#060b13", bounce: "#22406c", glow: 0x0a84ff },
};

/** The rainbow film laid over Foil badges. */
export const FOIL_FILM = ["#ff7ad9", "#ffd36b", "#7dffb5", "#6bd8ff", "#9b7bff", "#ff7ad9"];
