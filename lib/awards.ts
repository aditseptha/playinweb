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
