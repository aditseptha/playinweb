// Test harness for the badge migrations: a fresh PGlite database with a small copy of the
// schema (fixture.sql), the badge migrations applied in order, and helpers to act as users.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const here = (p) => new URL(p, import.meta.url);
const FIXTURE = readFileSync(here("./fixture.sql"), "utf8");
const MIGRATIONS = ["20261113120000_profile_badges.sql", "20261114100000_badge_celebrations.sql"].map((name) =>
  readFileSync(here(`../migrations/${name}`), "utf8"),
);

/** A fresh database. `before` runs between the fixture and the migration (for backfill tests). */
export async function setup(before) {
  const db = new PGlite();
  await db.exec(FIXTURE);
  const h = helpers(db);
  if (before) await before(h);
  for (const sql of MIGRATIONS) await db.exec(sql);
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
