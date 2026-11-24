// Run with `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { CLAIM_EVIDENCE_MAX, CLAIM_EVIDENCE_MIN, claimErrorMessage, decideErrorMessage, isClaimStatus } = await import("./claims.ts");

const migration = readFileSync(new URL("../supabase/migrations/20261124120000_project_claims.sql", import.meta.url), "utf8");

test("the form's evidence limits match the database", () => {
  assert.match(migration, new RegExp(`char_length\\(evidence\\) between ${CLAIM_EVIDENCE_MIN} and ${CLAIM_EVIDENCE_MAX}`));
});

test("every error the claim functions raise has its own message", () => {
  const raised = [...migration.matchAll(/raise exception '([^']+)'/g)].map((m) => m[1]);
  const fallbackClaim = claimErrorMessage("");
  const fallbackDecide = decideErrorMessage("");
  for (const text of raised) {
    const known = claimErrorMessage(text) !== fallbackClaim || decideErrorMessage(text) !== fallbackDecide;
    assert.ok(known, `no message for "${text}"`);
  }
});

test("unknown errors fall back to a retry message", () => {
  assert.equal(claimErrorMessage("network down"), "Could not send your claim. Try again.");
  assert.equal(decideErrorMessage(undefined), "Could not save the decision. Try again.");
});

test("claim statuses", () => {
  assert.ok(isClaimStatus("pending"));
  assert.ok(isClaimStatus("approved"));
  assert.ok(!isClaimStatus("withdrawn"));
});
