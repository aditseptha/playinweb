// Awards (#30): Best of PlayInWeb, the PlayInWeb team's mark for the games we love most.
// The rules live in supabase/migrations/20261124130000_awards.sql; this file holds the limits the
// admin form shows, plain-English text for the errors the database raises, and small helpers the
// public pages share. No "@/" imports here, so `npm test` can load this file directly.

export const BEST_OF_SLUG = "best-of-playinweb";

/** Lengths the database accepts (award_grants_citation_len, award_grants_reason_len). */
export const CITATION_MIN = 10;
export const CITATION_MAX = 400;
export const REVOKE_REASON_MIN = 3;
export const REVOKE_REASON_MAX = 400;

/** A game's award counts as new for this many days (the "New" tag on the homepage row). */
export const NEW_AWARD_DAYS = 30;

export function isNewAward(awardedAt: string | null | undefined, now = Date.now(), days = NEW_AWARD_DAYS) {
  if (!awardedAt) return false;
  const at = Date.parse(awardedAt);
  return Number.isFinite(at) && now - at >= 0 && now - at < days * 86_400_000;
}

/** How a medal looks, from award_types.medal. Missing fields fall back to the Best of PlayInWeb medal. */
export type AwardMedal = {
  shape: string;
  metal: string;
  enamel: string;
  ribbon: string;
  /** Lettering on the front: top arc and bottom arc. */
  top: string;
  bottom: string;
};

const DEFAULT_MEDAL: AwardMedal = { shape: "sun", metal: "gold", enamel: "#0a84ff", ribbon: "brand", top: "Best of", bottom: "PlayInWeb" };

export function medalFromJson(value: unknown): AwardMedal {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const text = (key: keyof AwardMedal) => (typeof raw[key] === "string" && (raw[key] as string).trim() ? (raw[key] as string).trim() : DEFAULT_MEDAL[key]);
  return {
    shape: text("shape"),
    metal: text("metal"),
    enamel: text("enamel"),
    ribbon: text("ribbon"),
    top: text("top"),
    bottom: text("bottom"),
  };
}

/** What to tell an admin when admin_grant_award refuses. */
export function grantErrorMessage(raw: string | null | undefined): string {
  const message = (raw ?? "").toLowerCase();
  if (message.includes("not allowed")) return "Only admins can give awards.";
  if (message.includes("unknown award")) return "That award does not exist or is switched off.";
  if (message.includes("only published games")) return "Only published games can get an award.";
  if (message.includes("10 to 400")) return `Write why this game, in ${CITATION_MIN} to ${CITATION_MAX} characters.`;
  if (message.includes("already has this award")) return "This game already has this award.";
  return "Could not give the award. Try again.";
}

/** What to tell an admin when admin_revoke_award refuses. */
export function revokeErrorMessage(raw: string | null | undefined): string {
  const message = (raw ?? "").toLowerCase();
  if (message.includes("not allowed")) return "Only admins can take awards back.";
  if (message.includes("say why")) return `Say why, in ${REVOKE_REASON_MIN} to ${REVOKE_REASON_MAX} characters.`;
  if (message.includes("already revoked")) return "This award was already taken back. Reload the list.";
  return "Could not take the award back. Try again.";
}

/** A standing award on a game, as the game page shows it. */
export type GameAward = {
  id: string;
  slug: string;
  name: string;
  description: string;
  howChosen: string;
  citation: string;
  awardedAt: string;
  medal: AwardMedal;
};

/** The columns the public pages select from award_grants, with the award kind joined in. */
export const GAME_AWARD_SELECT = "id, citation, awarded_at, award:award_types(slug, name, description, how_chosen, medal)";

/** One award_grants row (GAME_AWARD_SELECT) to a GameAward; null when the award kind did not come back. */
export function toGameAward(row: unknown): GameAward | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const kind = Array.isArray(r.award) ? r.award[0] : r.award;
  if (!kind || typeof kind !== "object") return null;
  const k = kind as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  if (!str(r.id) || !str(k.slug) || !str(k.name)) return null;
  return {
    id: str(r.id),
    slug: str(k.slug),
    name: str(k.name),
    description: str(k.description),
    howChosen: str(k.how_chosen),
    citation: str(r.citation),
    awardedAt: str(r.awarded_at),
    medal: medalFromJson(k.medal),
  };
}

/** Best of PlayInWeb first, then the newest. */
export function sortAwards(list: GameAward[]): GameAward[] {
  return [...list].sort((a, b) => {
    if ((a.slug === BEST_OF_SLUG) !== (b.slug === BEST_OF_SLUG)) return a.slug === BEST_OF_SLUG ? -1 : 1;
    return Date.parse(b.awardedAt || "0") - Date.parse(a.awardedAt || "0");
  });
}

/** The homepage "Best of PlayInWeb" row shows once this many games hold the award. */
export const BEST_OF_ROW_MIN = 3;

/**
 * The link an owner shares for their award: the game page, tagged so Umami can tell award shares
 * apart. `from` says where the share started ("card", "popup", "winner").
 */
export function awardShareUrl(gameUrl: string, from: string) {
  try {
    const url = new URL(gameUrl);
    url.searchParams.set("utm_source", "share");
    url.searchParams.set("utm_medium", from);
    url.searchParams.set("utm_campaign", BEST_OF_SLUG);
    return url.toString();
  } catch {
    return gameUrl;
  }
}

/** The line that goes with a shared award. */
export function awardShareText(gameTitle: string, awardName: string) {
  return `${gameTitle} is ${awardName}! Play it free in your browser on PlayInWeb.`;
}

/** One row of my_awards(): an award the owner has not seen yet. */
export type MyAwardRow = {
  id: string;
  award_slug: string;
  award_name: string;
  project_id: string;
  title: string;
  slug: string;
  owner_handle: string;
  citation: string;
  awarded_at: string;
};

/** The bell entry for an award on one of the account's games. */
export function awardNoticeText(gameTitle: string, awardName: string) {
  return { title: `${gameTitle} is now ${awardName}`, detail: "Picked by the PlayInWeb team. Share it from the game page." };
}

type AwardRpcClient = {
  rpc(fn: "mark_awards_seen", args: { p_grants: string[] }): PromiseLike<{ error: unknown }>;
};

/**
 * Marks awards seen so their popup never shows again. Supabase builders are lazy, so this awaits the
 * request (a fire-and-forget call would never be sent). Returns false when it failed.
 */
export async function markAwardsSeen(client: AwardRpcClient, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  try {
    const { error } = await client.rpc("mark_awards_seen", { p_grants: ids });
    return !error;
  } catch {
    return false;
  }
}
