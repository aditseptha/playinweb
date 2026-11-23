// Run with `npm test`. What players see about donations and tips while they are closed (#53).
import assert from "node:assert/strict";
import { test } from "node:test";
import { BADGES } from "./badges.ts";
import { planCelebration } from "./badge-celebration.ts";
import { BEFORE_TURNING_ON, MONEY_CLOSED, badgeOpen, claimIntro, noticeKindOpen, noticesEmptyText } from "./money-features.ts";

const DONATIONS = { donations: true, tip: false };
const TIPS = { donations: false, tip: true };
const BOTH = { donations: true, tip: true };

test("Supporter is hidden until donations or tips open; every other badge always shows", () => {
  assert.equal(badgeOpen("supporter", MONEY_CLOSED), false);
  assert.equal(badgeOpen("supporter", DONATIONS), true);
  assert.equal(badgeOpen("supporter", TIPS), true);
  const shown = BADGES.filter((b) => badgeOpen(b.id, MONEY_CLOSED));
  assert.equal(shown.length, BADGES.length - 1);
  assert.ok(!shown.some((b) => b.id === "supporter"));
});

test("a closed badge never pops up, so it waits unseen until it opens", () => {
  const rows = [
    { badge: "supporter", level: 1, seen_level: 0, leveled_at: "2026-11-23T10:00:00Z" },
    { badge: "fan", level: 1, seen_level: 0, leveled_at: "2026-11-23T10:01:00Z" },
  ];
  const open = rows.filter((r) => badgeOpen(r.badge, MONEY_CLOSED));
  const ids = planCelebration(open).flatMap((m) => m.items.map((u) => u.def.id));
  assert.deepEqual(ids, ["fan"]);
});

test("donation and payout notices follow Donations, tip notices follow Tips", () => {
  for (const kind of ["donation", "payout", "tip"]) assert.equal(noticeKindOpen(kind, MONEY_CLOSED), false);
  assert.equal(noticeKindOpen("donation", DONATIONS), true);
  assert.equal(noticeKindOpen("payout", DONATIONS), true);
  assert.equal(noticeKindOpen("tip", DONATIONS), false);
  assert.equal(noticeKindOpen("tip", TIPS), true);
  assert.equal(noticeKindOpen("donation", TIPS), false);
});

test("wording mentions donations only while Donations is open", () => {
  const money = /donat|payout|\btips?\b/i;
  assert.doesNotMatch(noticesEmptyText(MONEY_CLOSED), money);
  assert.doesNotMatch(claimIntro(MONEY_CLOSED), money);
  // Tips go to PlayInWeb, not to creators, so opening Tips alone changes neither.
  assert.doesNotMatch(noticesEmptyText(TIPS), money);
  assert.doesNotMatch(claimIntro(TIPS), money);
  assert.match(noticesEmptyText(BOTH), /Donations/);
  assert.match(claimIntro(DONATIONS), /take donations/);
});

test("both money features carry a reminder to restore the legal text first", () => {
  assert.match(BEFORE_TURNING_ON.donations, /lib\/legal\.ts/);
  assert.match(BEFORE_TURNING_ON.tip, /lib\/legal\.ts/);
});
