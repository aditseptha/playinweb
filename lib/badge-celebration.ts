// Which popups to show when badges arrive (#30). Pure, so the rules are easy to test.
//
// - card: a corner card that does not block the page. Most unlocks and level-ups.
// - spotlight: a centred celebration. Foil badges and an account's very first badge.
// - summary: one popup for three or more at once, such as the badges a launch backfill gave.
import { badgeDef, maxLevel, tierFor, type BadgeDef } from "./badges.ts";
import { formatCompact } from "./format-core.ts";

export type MyBadgeRow = { badge: string; level: number; seen_level: number; leveled_at: string };

export type Unlock = {
  def: BadgeDef;
  level: number;
  /** The level the owner saw last; 0 for a new badge. */
  from: number;
};

export type Moment =
  | { kind: "card"; items: [Unlock] }
  | { kind: "spotlight"; items: [Unlock] }
  | { kind: "summary"; items: Unlock[] };

/** Three or more new badges at once become one summary popup. */
export const SUMMARY_AT = 3;

export function planCelebration(rows: readonly MyBadgeRow[] | null | undefined): Moment[] {
  const all = rows ?? [];
  const fresh = all
    .filter((r) => r.level > r.seen_level && badgeDef(r.badge))
    .sort((a, b) => Date.parse(a.leveled_at) - Date.parse(b.leveled_at) || a.badge.localeCompare(b.badge))
    .map((r): Unlock => ({ def: badgeDef(r.badge)!, level: r.level, from: r.seen_level }));
  if (fresh.length === 0) return [];
  if (fresh.length >= SUMMARY_AT) return [{ kind: "summary", items: fresh }];

  // An account that has never seen a badge gets a spotlight for its first one.
  const firstEver = all.every((r) => r.seen_level === 0);
  const moments: Moment[] = fresh.map((item, i) =>
    item.def.kind === "foil" || (firstEver && i === 0) ? { kind: "spotlight", items: [item] } : { kind: "card", items: [item] },
  );
  // Spotlights first: they are the bigger moment, and cards can follow them.
  return [...moments.filter((m) => m.kind === "spotlight"), ...moments.filter((m) => m.kind === "card")];
}

/** "Badge unlocked!" or "Level up!" */
export function unlockHeadline(u: Unlock): string {
  return u.from > 0 ? "Level up!" : "Badge unlocked!";
}

const TIER_NAMES = { bronze: "Bronze", silver: "Silver", gold: "Gold", foil: "Foil", locked: "Locked" } as const;

/** "Lv 2 · Silver", "Foil", "Earned". */
export function unlockDetail(u: Unlock): string {
  if (u.def.kind === "foil") return "Foil";
  if (u.def.kind === "single") return "Earned";
  return `Lv ${u.level} · ${TIER_NAMES[tierFor(u.def, u.level)]}`;
}

/** What comes next: "Next: Lv 2 at 100 likes", "Max level", or the badge's mission for one-off badges. */
export function nextGoal(u: Unlock): string {
  if (u.def.kind !== "tiered") return u.def.mission;
  if (u.level >= maxLevel(u.def)) return "Max level. Nicely done!";
  return `Next: Lv ${u.level + 1} at ${formatCompact(u.def.thresholds[u.level])} ${u.def.unit}`;
}

/** The bell entry for a badge level: "Level up: Fan" and "Lv 2 · Silver". Null for unknown ids. */
export function badgeNoticeText(badge: string, level: number): { title: string; detail: string } | null {
  const def = badgeDef(badge);
  if (!def || level <= 0) return null;
  const u: Unlock = { def, level, from: level > 1 ? level - 1 : 0 };
  return { title: `${u.from > 0 ? "Level up" : "Badge unlocked"}: ${def.name}`, detail: unlockDetail(u) };
}

/** Anything with a Supabase-style rpc(). Kept structural so tests can pass a fake. */
type RpcClient = {
  rpc(fn: "mark_badges_seen", args: { p_badges: string[] }): PromiseLike<{ error: unknown }>;
};

/**
 * Marks badges seen so their popup never shows again. Supabase query builders are lazy: the
 * request is only sent when the result is awaited, so this must be awaited, never fired and
 * forgotten. Returns false when the request failed.
 */
export async function markBadgesSeen(client: RpcClient, badges: string[]): Promise<boolean> {
  if (badges.length === 0) return true;
  try {
    const { error } = await client.rpc("mark_badges_seen", { p_badges: badges });
    return !error;
  } catch {
    return false;
  }
}

/** A key per badge level, to never show the same level twice in one visit. */
export function unlockKey(u: Unlock): string {
  return `${u.def.id}:${u.level}`;
}
