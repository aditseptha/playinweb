// Run with `npm test`. Applies the real badge migration to a small copy of the schema in PGlite
// (Postgres compiled to WebAssembly), then checks the triggers, the RPCs and the access rules.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const here = (p) => new URL(p, import.meta.url);
const FIXTURE = readFileSync(here("./fixture.sql"), "utf8");
const MIGRATION = readFileSync(here("../migrations/20261113120000_profile_badges.sql"), "utf8");

/** A fresh database. `before` runs between the fixture and the migration (for backfill tests). */
async function setup(before) {
  const db = new PGlite();
  await db.exec(FIXTURE);
  const h = helpers(db);
  if (before) await before(h);
  await db.exec(MIGRATION);
  return h;
}

function helpers(db) {
  let n = 0;
  const one = async (sql, params) => (await db.query(sql, params)).rows[0];
  const h = {
    db,
    async user(handle = `user${++n}`, fields = {}) {
      const { id } = await one("insert into auth.users (id) values (gen_random_uuid()) returning id");
      await db.query(
        `insert into public.profiles (id, handle, display_name, bio, avatar_path, banner_path, created_at)
         values ($1, $2, $2, $3, $4, $5, coalesce($6::timestamptz, now()))`,
        [id, handle, fields.bio ?? "", fields.avatar ?? null, fields.banner ?? null, fields.createdAt ?? null],
      );
      return id;
    },
    async game(owner, fields = {}) {
      const row = await one(
        `insert into public.projects (owner_id, title, slug, published, classification)
         values ($1, 'Game', $2, $3, $4) returning id`,
        [owner, `g${++n}`, fields.published ?? true, fields.classification ?? "game"],
      );
      return row.id;
    },
    async games(owner, count) {
      const ids = [];
      for (let i = 0; i < count; i++) ids.push(await h.game(owner));
      return ids;
    },
    as(uid) {
      return db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
    },
    async play(uid, pid) {
      await h.as(uid);
      await db.query("select public.record_play($1)", [pid]);
      await h.as(null);
    },
    like: (uid, pid) => db.query("insert into public.project_likes (project_id, user_id) values ($1, $2)", [pid, uid]),
    unlike: (uid, pid) => db.query("delete from public.project_likes where project_id = $1 and user_id = $2", [pid, uid]),
    comment: (uid, pid) => db.query("insert into public.project_comments (project_id, author_id, body) values ($1, $2, 'gg')", [pid, uid]),
    follow: (follower, creator) =>
      db.query("insert into public.profile_follows (creator_id, follower_id) values ($1, $2)", [creator, follower]),
    donate: (uid, pid) => db.query("insert into public.donations (user_id, project_id, amount) values ($1, $2, 5)", [uid, pid]),
    tip: (uid) => db.query("insert into public.tips (user_id, amount) values ($1, 3)", [uid]),
    async level(uid, badge) {
      const row = await one("select level from public.profile_badges where profile_id = $1 and badge = $2", [uid, badge]);
      return row?.level ?? 0;
    },
    /** profile_badge_board as `viewer` (null = signed out), keyed by badge. */
    async board(uid, viewer = null) {
      await h.as(viewer);
      const { rows } = await db.query("select * from public.profile_badge_board($1)", [uid]);
      await h.as(null);
      return Object.fromEntries(rows.map((r) => [r.badge, r]));
    },
    async fans(creatorGame, count) {
      for (let i = 0; i < count; i++) await h.like(await h.user(), creatorGame);
    },
  };
  return h;
}

test("record_play needs a signed-in account", async () => {
  const h = await setup();
  const pid = await h.game(await h.user());
  await h.as(null);
  await assert.rejects(h.db.query("select public.record_play($1)", [pid]), /sign in/);
});

test("record_play skips unpublished games and keeps one row per game", async () => {
  const h = await setup();
  const owner = await h.user();
  const player = await h.user();
  const draft = await h.game(owner, { published: false });
  const live = await h.game(owner);
  await h.play(player, draft);
  await h.play(player, live);
  await h.play(player, live);
  const { rows } = await h.db.query("select project_id from public.profile_plays where profile_id = $1", [player]);
  assert.deepEqual(rows.map((r) => r.project_id), [live]);
});

test("Explorer reaches Lv1 at 3 different games, and your own games do not count", async () => {
  const h = await setup();
  const owner = await h.user();
  const player = await h.user();
  const [a, b, c] = await h.games(owner, 3);
  const mine = await h.game(player);
  await h.play(player, a);
  await h.play(player, b);
  await h.play(player, mine);
  assert.equal(await h.level(player, "explorer"), 0);
  await h.play(player, c);
  assert.equal(await h.level(player, "explorer"), 1);
});

test("Talk of the Town counts games, not comments", async () => {
  const h = await setup();
  const owner = await h.user();
  const talker = await h.user();
  const [first, ...rest] = await h.games(owner, 5);
  for (let i = 0; i < 5; i++) await h.comment(talker, first);
  assert.equal(await h.level(talker, "talk"), 0);
  for (const pid of rest) await h.comment(talker, pid);
  assert.equal(await h.level(talker, "talk"), 1);
});

test("Fan keeps its level after an unlike, while progress drops", async () => {
  const h = await setup();
  const owner = await h.user();
  const fan = await h.user();
  const ids = await h.games(owner, 10);
  for (const pid of ids) await h.like(fan, pid);
  assert.equal(await h.level(fan, "fan"), 1);
  await h.unlike(fan, ids[0]);
  assert.equal(await h.level(fan, "fan"), 1);
  const board = await h.board(fan);
  assert.equal(board.fan.level, 1);
  assert.equal(board.fan.progress, 9);
});

test("Well Liked ignores self-likes and unpublished games", async () => {
  const h = await setup();
  const creator = await h.user();
  const pid = await h.game(creator);
  await h.like(creator, pid);
  await h.fans(pid, 9);
  assert.equal(await h.level(creator, "wellliked"), 0);
  await h.fans(pid, 1);
  assert.equal(await h.level(creator, "wellliked"), 1);

  const other = await h.user();
  const draft = await h.game(other, { published: false });
  await h.fans(draft, 10);
  assert.equal(await h.level(other, "wellliked"), 0);
});

test("Following levels up at 10 followers", async () => {
  const h = await setup();
  const creator = await h.user();
  for (let i = 0; i < 9; i++) await h.follow(await h.user(), creator);
  assert.equal(await h.level(creator, "following"), 0);
  await h.follow(await h.user(), creator);
  assert.equal(await h.level(creator, "following"), 1);
});

test("Crowd Pleaser counts unique players and skips the creator", async () => {
  const h = await setup();
  const creator = await h.user();
  const [a, b] = await h.games(creator, 2);
  await h.play(creator, a);
  for (let i = 0; i < 99; i++) {
    const p = await h.user();
    await h.play(p, a);
    if (i < 10) await h.play(p, b);
  }
  assert.equal(await h.level(creator, "crowd"), 0);
  assert.equal((await h.board(creator)).crowd.progress, 99);
  await h.play(await h.user(), b);
  assert.equal(await h.level(creator, "crowd"), 1);
});

test("First Game counts published games, including one published later", async () => {
  const h = await setup();
  const creator = await h.user();
  const draft = await h.game(creator, { published: false });
  await h.game(creator, { classification: "assets" });
  assert.equal(await h.level(creator, "firstgame"), 0);
  await h.db.query("update public.projects set published = true where id = $1", [draft]);
  assert.equal(await h.level(creator, "firstgame"), 1);
  await h.games(creator, 2);
  assert.equal(await h.level(creator, "firstgame"), 2);
});

test("Supporter counts donations and tips, and hides its number from other people", async () => {
  const h = await setup();
  const owner = await h.user();
  const pid = await h.game(owner);
  const backer = await h.user();
  await h.tip(backer);
  assert.equal(await h.level(backer, "supporter"), 1);
  for (let i = 0; i < 4; i++) await h.donate(backer, pid);
  assert.equal(await h.level(backer, "supporter"), 2);
  assert.equal((await h.board(backer, backer)).supporter.progress, 5);
  assert.equal((await h.board(backer, owner)).supporter.progress, null);
  assert.equal((await h.board(backer, null)).supporter.progress, null);
});

test("Complete Page needs an avatar, a banner and a bio", async () => {
  const h = await setup();
  const id = await h.user("halfway", { avatar: "a.png", bio: "Hi" });
  assert.equal(await h.level(id, "complete"), 0);
  await h.db.query("update public.profiles set banner_path = 'b.png' where id = $1", [id]);
  assert.equal(await h.level(id, "complete"), 1);
});

test("Early Bird goes to the first 100 accounts, not counting the listed account", async () => {
  const h = await setup();
  const base = Date.parse("2026-01-01T00:00:00Z");
  const at = (i) => new Date(base + i * 60_000).toISOString();
  await h.user("listed", { createdAt: at(0) });
  const ids = [];
  for (let i = 1; i <= 101; i++) ids.push(await h.user(`early${i}`, { createdAt: at(i) }));
  assert.equal(await h.level(ids[0], "earlybird"), 1);
  assert.equal(await h.level(ids[99], "earlybird"), 1);
  assert.equal(await h.level(ids[100], "earlybird"), 0);
});

test("The listed account never earns badges and has no board", async () => {
  const h = await setup();
  const listed = await h.user("listed");
  const pid = await h.game(listed);
  await h.fans(pid, 10);
  const { rows } = await h.db.query("select * from public.profile_badges where profile_id = $1", [listed]);
  assert.deepEqual(rows, []);
  assert.deepEqual(await h.board(listed), {});
});

test("Claimed arrives when a curated game's claim is approved", async () => {
  const h = await setup();
  const listed = await h.user("listed");
  const maker = await h.user();
  const pid = await h.game(listed);
  await h.db.query("insert into public.project_curation (project_id) values ($1)", [pid]);
  await h.db.query("update public.projects set owner_id = $1 where id = $2", [maker, pid]);
  assert.equal(await h.level(maker, "claimed"), 0);
  await h.db.query("update public.project_curation set status = 'claimed', claimed_at = now() where project_id = $1", [pid]);
  assert.equal(await h.level(maker, "claimed"), 1);
});

test("A revoked badge stays revoked and leaves the board", async () => {
  const h = await setup();
  const owner = await h.user();
  const fan = await h.user();
  const ids = await h.games(owner, 12);
  for (const pid of ids.slice(0, 10)) await h.like(fan, pid);
  await h.db.query("update public.profile_badges set revoked_at = now() where profile_id = $1 and badge = 'fan'", [fan]);
  for (const pid of ids.slice(10)) await h.like(fan, pid);
  const row = (await h.db.query("select level, revoked_at from public.profile_badges where profile_id = $1 and badge = 'fan'", [fan])).rows[0];
  assert.equal(row.level, 1);
  assert.ok(row.revoked_at);
  const board = await h.board(fan);
  assert.equal(board.fan.level, 0);
  assert.equal(board.fan.progress, 12);
});

test("The board lists all 11 badges for a new account", async () => {
  const h = await setup();
  const id = await h.user();
  const board = await h.board(id);
  assert.deepEqual(Object.keys(board).sort(), [
    "claimed", "complete", "crowd", "earlybird", "explorer", "fan", "firstgame", "following", "supporter", "talk", "wellliked",
  ]);
  assert.equal(board.explorer.level, 0);
  assert.equal(board.explorer.progress, 0);
  assert.equal(board.earlybird.level, 1);
});

test("The migration backfills badges from existing likes, comments and games", async () => {
  let creator;
  let fan;
  const h = await setup(async (pre) => {
    creator = await pre.user();
    fan = await pre.user();
    const ids = await pre.games(creator, 10);
    for (const pid of ids) {
      await pre.like(fan, pid);
      await pre.comment(fan, pid);
    }
  });
  assert.equal(await h.level(creator, "firstgame"), 3);
  assert.equal(await h.level(creator, "wellliked"), 1);
  assert.equal(await h.level(fan, "fan"), 1);
  assert.equal(await h.level(fan, "talk"), 1);
});

test("Signed-in clients cannot write badges or plays directly", async () => {
  const h = await setup();
  const id = await h.user();
  const pid = await h.game(await h.user());
  await h.as(id);
  await h.db.exec("set role authenticated");
  await assert.rejects(
    h.db.query("insert into public.profile_badges (profile_id, badge, level) values ($1, 'fan', 3)", [id]),
    /permission denied/,
  );
  await assert.rejects(
    h.db.query("insert into public.profile_plays (profile_id, project_id) values ($1, $2)", [id, pid]),
    /permission denied/,
  );
  await h.db.query("select public.record_play($1)", [pid]);
  const { rows } = await h.db.query("select count(*)::int as n from public.profile_plays where profile_id = $1", [id]);
  assert.equal(rows[0].n, 1);
  await h.db.exec("reset role");
});
