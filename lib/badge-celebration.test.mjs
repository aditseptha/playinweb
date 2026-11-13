// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

const { badgeNoticeText, markBadgesSeen, nextGoal, planCelebration, unlockDetail, unlockHeadline, unlockKey, SUMMARY_AT } = await import("./badge-celebration.ts");
const { isPlaying, setPlaying, subscribePlaying } = await import("./badge-events.ts");

const row = (badge, level, seen, minute = 0) => ({
  badge,
  level,
  seen_level: seen,
  leveled_at: new Date(Date.UTC(2026, 10, 14, 10, minute)).toISOString(),
});
const kinds = (moments) => moments.map((m) => `${m.kind}:${m.items.map((u) => `${u.def.id}${u.level}`).join(",")}`);

test("nothing new means no popups", () => {
  assert.deepEqual(planCelebration([row("fan", 2, 2), row("talk", 1, 1)]), []);
  assert.deepEqual(planCelebration([]), []);
  assert.deepEqual(planCelebration(null), []);
});

test("an account's very first badge gets the spotlight", () => {
  assert.deepEqual(kinds(planCelebration([row("fan", 1, 0)])), ["spotlight:fan1"]);
});

test("later unlocks and level-ups are corner cards", () => {
  const moments = planCelebration([row("fan", 2, 1), row("talk", 1, 0, 1), row("explorer", 1, 1)]);
  assert.deepEqual(kinds(moments), ["card:fan2", "card:talk1"]);
});

test("Foil badges always get the spotlight, ahead of cards", () => {
  const moments = planCelebration([row("fan", 2, 1, 0), row("earlybird", 1, 0, 1)]);
  assert.deepEqual(kinds(moments), ["spotlight:earlybird1", "card:fan2"]);
});

test("two new badges on a fresh account: the first is the spotlight, the second a card", () => {
  assert.deepEqual(kinds(planCelebration([row("talk", 1, 0, 2), row("fan", 1, 0, 1)])), ["spotlight:fan1", "card:talk1"]);
});

test(`${SUMMARY_AT} or more new badges become one summary, oldest first`, () => {
  const moments = planCelebration([row("talk", 1, 0, 3), row("fan", 1, 0, 1), row("earlybird", 1, 0, 2), row("explorer", 1, 1)]);
  assert.deepEqual(kinds(moments), ["summary:fan1,earlybird1,talk1"]);
});

test("unknown badge ids are ignored", () => {
  assert.deepEqual(kinds(planCelebration([row("retired", 1, 0), row("fan", 1, 1), row("talk", 2, 1)])), ["card:talk2"]);
});

test("headline and detail text", () => {
  const [unlock] = planCelebration([row("fan", 1, 0)])[0].items;
  assert.equal(unlockHeadline(unlock), "Badge unlocked!");
  assert.equal(unlockDetail(unlock), "Lv 1 · Bronze");
  assert.equal(unlockKey(unlock), "fan:1");
  const [up] = planCelebration([row("fan", 3, 2), row("talk", 1, 1)])[0].items;
  assert.equal(unlockHeadline(up), "Level up!");
  assert.equal(unlockDetail(up), "Lv 3 · Gold");
  assert.equal(unlockDetail(planCelebration([row("complete", 1, 0)])[0].items[0]), "Earned");
  assert.equal(unlockDetail(planCelebration([row("claimed", 1, 0)])[0].items[0]), "Foil");
});

test("nextGoal names the next level, or says the badge is maxed", () => {
  const goal = (r) => nextGoal(planCelebration([r])[0].items[0]);
  assert.equal(goal(row("fan", 1, 0)), "Next: Lv 2 at 100 likes");
  assert.equal(goal(row("crowd", 2, 0)), "Next: Lv 3 at 10K players");
  assert.equal(goal(row("fan", 3, 0)), "Max level. Nicely done!");
  assert.equal(goal(row("earlybird", 1, 0)), "One of the first 100 accounts on PlayInWeb");
});

test("badgeNoticeText writes the bell entry for a badge level", () => {
  assert.deepEqual(badgeNoticeText("fan", 1), { title: "Badge unlocked: Fan", detail: "Lv 1 · Bronze" });
  assert.deepEqual(badgeNoticeText("crowd", 2), { title: "Level up: Crowd Pleaser", detail: "Lv 2 · Silver" });
  assert.deepEqual(badgeNoticeText("earlybird", 1), { title: "Badge unlocked: Early Bird", detail: "Foil" });
  assert.equal(badgeNoticeText("retired", 1), null);
  assert.equal(badgeNoticeText("fan", 0), null);
});

// A fake Supabase client whose builders, like the real ones, only send when awaited.
function lazyClient(result = { error: null }) {
  const sent = [];
  return {
    sent,
    rpc(fn, args) {
      return {
        then(onFulfilled, onRejected) {
          sent.push({ fn, args });
          return Promise.resolve(result).then(onFulfilled, onRejected);
        },
      };
    },
  };
}

test("markBadgesSeen actually sends the request", async () => {
  const client = lazyClient();
  assert.equal(await markBadgesSeen(client, ["fan", "talk"]), true);
  assert.deepEqual(client.sent, [{ fn: "mark_badges_seen", args: { p_badges: ["fan", "talk"] } }]);
});

test("markBadgesSeen reports failures and skips empty lists", async () => {
  assert.equal(await markBadgesSeen(lazyClient({ error: { message: "nope" } }), ["fan"]), false);
  const idle = lazyClient();
  assert.equal(await markBadgesSeen(idle, []), true);
  assert.equal(idle.sent.length, 0);
  const throwing = { rpc: () => ({ then: (_ok, fail) => Promise.reject(new Error("offline")).then(undefined, fail) }) };
  assert.equal(await markBadgesSeen(throwing, ["fan"]), false);
});

test("play state notifies listeners only when it changes", () => {
  let calls = 0;
  const off = subscribePlaying(() => calls++);
  setPlaying(true);
  setPlaying(true);
  assert.equal(isPlaying(), true);
  setPlaying(false);
  assert.equal(isPlaying(), false);
  assert.equal(calls, 2);
  off();
  setPlaying(true);
  assert.equal(calls, 2);
  setPlaying(false);
});
