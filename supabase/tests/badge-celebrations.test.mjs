// Run with `npm test`. Checks seen_level, my_badges() and mark_badges_seen() in PGlite.
import assert from "node:assert/strict";
import { test } from "node:test";
import { setup } from "./harness.mjs";

async function mine(h, uid) {
  await h.as(uid);
  const { rows } = await h.db.query("select badge, level, seen_level from public.my_badges()");
  await h.as(null);
  return Object.fromEntries(rows.map((r) => [r.badge, { level: r.level, seen: r.seen_level }]));
}

async function markSeen(h, uid, badges) {
  await h.as(uid);
  await h.db.query("select public.mark_badges_seen($1)", [badges]);
  await h.as(null);
}

test("a new badge starts unseen", async () => {
  const h = await setup();
  const owner = await h.user();
  const fan = await h.user();
  for (const pid of await h.games(owner, 10)) await h.like(fan, pid);
  assert.deepEqual((await mine(h, fan)).fan, { level: 1, seen: 0 });
});

test("mark_badges_seen records the current level, and a level-up is unseen again", async () => {
  const h = await setup();
  const owner = await h.user();
  const fan = await h.user();
  const ids = await h.games(owner, 100);
  for (const pid of ids.slice(0, 10)) await h.like(fan, pid);
  await markSeen(h, fan, ["fan"]);
  assert.deepEqual((await mine(h, fan)).fan, { level: 1, seen: 1 });
  for (const pid of ids.slice(10)) await h.like(fan, pid);
  assert.deepEqual((await mine(h, fan)).fan, { level: 2, seen: 1 });
});

test("mark_badges_seen only touches the badges it names", async () => {
  const h = await setup();
  const owner = await h.user();
  const fan = await h.user();
  for (const pid of await h.games(owner, 10)) {
    await h.like(fan, pid);
    await h.comment(fan, pid);
  }
  await markSeen(h, fan, ["talk"]);
  const rows = await mine(h, fan);
  assert.equal(rows.talk.seen, 1);
  assert.equal(rows.fan.seen, 0);
});

test("my_badges and mark_badges_seen only reach the signed-in account", async () => {
  const h = await setup();
  const owner = await h.user();
  const fan = await h.user();
  const stranger = await h.user();
  for (const pid of await h.games(owner, 10)) await h.like(fan, pid);
  assert.equal((await mine(h, stranger)).fan, undefined);
  await markSeen(h, stranger, ["fan"]);
  assert.equal((await mine(h, fan)).fan.seen, 0);
});

test("signed-out callers cannot mark badges, and revoked badges are left out", async () => {
  const h = await setup();
  const owner = await h.user();
  const fan = await h.user();
  for (const pid of await h.games(owner, 10)) await h.like(fan, pid);
  await h.as(null);
  await assert.rejects(h.db.query("select public.mark_badges_seen($1)", [["fan"]]), /sign in/);
  await h.db.query("update public.profile_badges set revoked_at = now() where profile_id = $1 and badge = 'fan'", [fan]);
  assert.equal((await mine(h, fan)).fan, undefined);
});

test("badges from before the migration arrive unseen, for the summary popup", async () => {
  let fan;
  const h = await setup(async (pre) => {
    const owner = await pre.user();
    fan = await pre.user();
    for (const pid of await pre.games(owner, 10)) {
      await pre.like(fan, pid);
      await pre.comment(fan, pid);
    }
  });
  const rows = await mine(h, fan);
  assert.equal(rows.fan.seen, 0);
  assert.equal(rows.talk.seen, 0);
  assert.equal(rows.earlybird.seen, 0);
});
