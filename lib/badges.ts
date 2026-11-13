// Profile badges (#30): the catalogue and the rules for levels and progress text.
// The thresholds must match private.badge_thresholds() in
// supabase/migrations/20261113120000_profile_badges.sql; lib/badges.test.mjs checks that.
import { formatCompact } from "./format-core.ts";

export type BadgeId =
  | "explorer"
  | "talk"
  | "fan"
  | "supporter"
  | "firstgame"
  | "following"
  | "wellliked"
  | "crowd"
  | "complete"
  | "earlybird"
  | "claimed";

export type BadgeGroup = "player" | "creator" | "foil";

/** tiered: three levels (bronze, silver, gold). single: one level, shown in gold. foil: one rare level. */
export type BadgeKind = "tiered" | "single" | "foil";

/** The look of a badge: its metal, Foil, or locked. */
export type BadgeTier = "locked" | "bronze" | "silver" | "gold" | "foil";

export type BadgeDef = {
  id: BadgeId;
  name: string;
  group: BadgeGroup;
  kind: BadgeKind;
  /** What to do, shown while the badge is locked. */
  mission: string;
  /** Value needed for each level, lowest first. */
  thresholds: readonly number[];
  /** What the progress number counts, plural ("likes", "games played"). */
  unit: string;
};

export const BADGES: readonly BadgeDef[] = [
  { id: "explorer", name: "Explorer", group: "player", kind: "tiered", mission: "Play different games on PlayInWeb", thresholds: [3, 25, 100], unit: "games played" },
  { id: "talk", name: "Talk of the Town", group: "player", kind: "tiered", mission: "Comment on different games", thresholds: [5, 50, 250], unit: "games commented on" },
  { id: "fan", name: "Fan", group: "player", kind: "tiered", mission: "Like games", thresholds: [10, 100, 500], unit: "likes" },
  { id: "supporter", name: "Supporter", group: "player", kind: "tiered", mission: "Donate to a game or tip PlayInWeb", thresholds: [1, 5, 20], unit: "donations and tips" },
  { id: "firstgame", name: "First Game", group: "creator", kind: "tiered", mission: "Publish a game", thresholds: [1, 3, 10], unit: "games published" },
  { id: "following", name: "Following", group: "creator", kind: "tiered", mission: "Get followers", thresholds: [10, 100, 1000], unit: "followers" },
  { id: "wellliked", name: "Well Liked", group: "creator", kind: "tiered", mission: "Get likes on your games", thresholds: [10, 100, 1000], unit: "likes" },
  { id: "crowd", name: "Crowd Pleaser", group: "creator", kind: "tiered", mission: "Have players try your games", thresholds: [100, 1000, 10000], unit: "players" },
  { id: "complete", name: "Complete Page", group: "creator", kind: "single", mission: "Add an avatar, a banner and a bio", thresholds: [1], unit: "" },
  { id: "earlybird", name: "Early Bird", group: "foil", kind: "foil", mission: "One of the first 100 accounts on PlayInWeb", thresholds: [1], unit: "" },
  { id: "claimed", name: "Claimed", group: "foil", kind: "foil", mission: "Claim a curated game you made", thresholds: [1], unit: "" },
];

const BY_ID = new Map(BADGES.map((d) => [d.id, d]));

export function badgeDef(id: string): BadgeDef | undefined {
  return BY_ID.get(id as BadgeId);
}

export function maxLevel(def: BadgeDef): number {
  return def.thresholds.length;
}

/** The level a value reaches: how many thresholds it meets. */
export function levelFor(def: BadgeDef, value: number): number {
  return def.thresholds.filter((need) => value >= need).length;
}

export function tierFor(def: BadgeDef, level: number): BadgeTier {
  if (level <= 0) return "locked";
  if (def.kind === "foil") return "foil";
  if (def.kind === "single") return "gold";
  return level >= 3 ? "gold" : level === 2 ? "silver" : "bronze";
}

/** Inner stripes drawn on the badge: one per level, three on Foil, none on single-level or locked badges. */
export function stripeCount(def: BadgeDef, level: number): number {
  const tier = tierFor(def, level);
  if (tier === "locked" || def.kind === "single") return 0;
  if (tier === "foil") return 3;
  return Math.min(level, 3);
}

/** Short label under the badge: "Lv 2", "Earned", "Foil", "Locked". */
export function levelLabel(def: BadgeDef, level: number): string {
  if (level <= 0) return "Locked";
  if (def.kind === "foil") return "Foil";
  if (def.kind === "single") return "Earned";
  return `Lv ${Math.min(level, maxLevel(def))}`;
}

/**
 * One line about where the badge stands, for its tooltip and popover.
 * `progress` is null when the number is private (Supporter on someone else's profile) or unknown.
 */
export function progressLabel(def: BadgeDef, level: number, progress: number | null): string {
  if (def.kind !== "tiered") return level > 0 ? "Earned" : def.mission;
  const max = maxLevel(def);
  if (level >= max) return progress == null ? "Max level" : `Max level · ${formatCompact(progress)} ${def.unit}`;
  if (progress == null) return level > 0 ? `Lv ${level} of ${max}` : def.mission;
  const next = def.thresholds[level];
  const target = level > 0 ? `to Lv ${level + 1}` : "to unlock";
  return `${formatCompact(Math.min(progress, next))} / ${formatCompact(next)} ${def.unit} ${target}`;
}

export type BadgeBoardRow = {
  badge: string;
  level: number;
  earned_at: string | null;
  progress: number | null;
};

export type BadgeState = {
  def: BadgeDef;
  level: number;
  progress: number | null;
  earnedAt: string | null;
};

/** Every badge in catalogue order. Badges missing from `rows` are locked with unknown progress. */
export function badgeBoard(rows: readonly BadgeBoardRow[] | null | undefined): BadgeState[] {
  const byBadge = new Map((rows ?? []).map((r) => [r.badge, r]));
  return BADGES.map((def) => {
    const row = byBadge.get(def.id);
    return {
      def,
      level: Math.max(0, Math.min(row?.level ?? 0, maxLevel(def))),
      progress: row?.progress ?? null,
      earnedAt: row?.earned_at ?? null,
    };
  });
}
