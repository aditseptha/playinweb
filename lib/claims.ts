// Claim requests (#30, PR 0): a creator asks for their curated game, an admin approves or rejects.
// The rules live in supabase/migrations/20261124120000_project_claims.sql; this file holds the
// limits the form shows and plain-English text for the errors the database raises.
// No "@/" imports here, so `npm test` can load this file directly.

/** Evidence length the database accepts (project_claims_evidence_len). */
export const CLAIM_EVIDENCE_MIN = 10;
export const CLAIM_EVIDENCE_MAX = 2000;

export type ClaimStatus = "pending" | "approved" | "rejected";

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  pending: "Waiting",
  approved: "Approved",
  rejected: "Rejected",
};

export function isClaimStatus(value: unknown): value is ClaimStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

/** What to tell the claimant when submit_claim refuses. */
export function claimErrorMessage(raw: string | null | undefined): string {
  const message = (raw ?? "").toLowerCase();
  if (message.includes("sign in")) return "Sign in to claim this game.";
  if (message.includes("confirm the game is yours")) return "Tell us a little more, so we can check the game is yours.";
  if (message.includes("already have a claim")) return "You already sent a claim for this game. We will reply by email.";
  if (message.includes("too many claims")) return "You have a few claims waiting already. We will answer those first.";
  if (message.includes("cannot be claimed")) return "This game can no longer be claimed.";
  return "Could not send your claim. Try again.";
}

/** What to tell an admin when admin_decide_claim refuses. */
export function decideErrorMessage(raw: string | null | undefined): string {
  const message = (raw ?? "").toLowerCase();
  if (message.includes("already decided")) return "Someone already decided this claim. Reload to see it.";
  if (message.includes("claim not found")) return "This claim no longer exists. Reload the list.";
  if (message.includes("no longer a curated game")) return "This game is no longer a curated game, so it cannot move.";
  if (message.includes("not allowed")) return "Only admins can decide claims.";
  return "Could not save the decision. Try again.";
}
