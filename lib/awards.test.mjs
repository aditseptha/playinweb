// Run with `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const {
  BEST_OF_SLUG,
  CITATION_MAX,
  CITATION_MIN,
  REVOKE_REASON_MAX,
  REVOKE_REASON_MIN,
  grantErrorMessage,
  isNewAward,
  medalFromJson,
  revokeErrorMessage,
} = await import("./awards.ts");

const migration = readFileSync(new URL("../supabase/migrations/20261124130000_awards.sql", import.meta.url), "utf8");

test("the form's limits and the award slug match the database", () => {
  assert.match(migration, new RegExp(`char_length\\(citation\\) between ${CITATION_MIN} and ${CITATION_MAX}`));
  assert.match(migration, new RegExp(`char_length\\(revoke_reason\\) between ${REVOKE_REASON_MIN} and ${REVOKE_REASON_MAX}`));
  assert.ok(migration.includes(`'${BEST_OF_SLUG}'`));
});

test("every error the award functions raise has its own message", () => {
  const raised = [...migration.matchAll(/raise exception '([^']+)'/g)].map((m) => m[1]);
  assert.ok(raised.length >= 6);
  for (const text of raised) {
    const known = grantErrorMessage(text) !== grantErrorMessage("") || revokeErrorMessage(text) !== revokeErrorMessage("");
    assert.ok(known, `no message for "${text}"`);
  }
});

test("an award is new for 30 days", () => {
  const now = Date.parse("2026-12-31T00:00:00Z");
  assert.ok(isNewAward("2026-12-30T00:00:00Z", now));
  assert.ok(isNewAward("2026-12-02T00:00:01Z", now));
  assert.ok(!isNewAward("2026-12-01T00:00:00Z", now));
  assert.ok(!isNewAward("2027-01-02T00:00:00Z", now), "not new before it was given");
  assert.ok(!isNewAward(null, now));
  assert.ok(!isNewAward("not a date", now));
});

test("medal settings fall back to the Best of PlayInWeb medal", () => {
  assert.deepEqual(medalFromJson(null), { shape: "sun", metal: "gold", enamel: "#0a84ff", ribbon: "brand", top: "Best of", bottom: "PlayInWeb" });
  assert.equal(medalFromJson({ shape: "star", top: " " }).shape, "star");
  assert.equal(medalFromJson({ shape: "star", top: " " }).top, "Best of");
  assert.equal(medalFromJson(["sun"]).shape, "sun");
});
