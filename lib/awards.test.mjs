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

test("a grant row becomes the award the game page shows", async () => {
  const { toGameAward, sortAwards } = await import("./awards.ts");
  const row = {
    id: "g1",
    citation: "Tight controls and a great last level.",
    awarded_at: "2026-11-20T10:00:00Z",
    award: { slug: "best-of-playinweb", name: "Best of PlayInWeb", description: "d", how_chosen: "h", medal: null },
  };
  const award = toGameAward(row);
  assert.equal(award?.name, "Best of PlayInWeb");
  assert.equal(award?.howChosen, "h");
  assert.equal(award?.medal.shape, "sun");
  assert.equal(toGameAward({ ...row, award: [row.award] })?.slug, "best-of-playinweb", "joined as a list");
  assert.equal(toGameAward({ ...row, award: null }), null);
  assert.equal(toGameAward(null), null);
  const other = { ...award, id: "g2", slug: "other", awardedAt: "2026-11-23T00:00:00Z" };
  assert.deepEqual(sortAwards([other, award]).map((a) => a.id), ["g1", "g2"]);
});

test("an award share link is the game page with Umami tags", async () => {
  const { awardShareUrl, awardShareText } = await import("./awards.ts");
  const url = new URL(awardShareUrl("https://playinweb.com/mira/lantern-drift", "card"));
  assert.equal(url.pathname, "/mira/lantern-drift");
  assert.equal(url.searchParams.get("utm_source"), "share");
  assert.equal(url.searchParams.get("utm_medium"), "card");
  assert.equal(url.searchParams.get("utm_campaign"), "best-of-playinweb");
  assert.equal(awardShareUrl("not a url", "card"), "not a url");
  assert.match(awardShareText("Lantern Drift", "Best of PlayInWeb"), /^Lantern Drift is Best of PlayInWeb!/);
});

test("marking awards seen is awaited and reports failure", async () => {
  const { markAwardsSeen } = await import("./awards.ts");
  const calls = [];
  const ok = { rpc: async (fn, args) => (calls.push([fn, args]), { error: null }) };
  assert.equal(await markAwardsSeen(ok, ["a"]), true);
  assert.deepEqual(calls, [["mark_awards_seen", { p_grants: ["a"] }]]);
  assert.equal(await markAwardsSeen(ok, []), true);
  assert.equal(calls.length, 1, "nothing to send");
  assert.equal(await markAwardsSeen({ rpc: async () => ({ error: { message: "x" } }) }, ["a"]), false);
  assert.equal(await markAwardsSeen({ rpc: async () => { throw new Error("offline"); } }, ["a"]), false);
});
