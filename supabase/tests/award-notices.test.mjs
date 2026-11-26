// Run with `npm test`. Applies the awards migrations (#30, PR 1 and PR 3) to the test schema in PGlite,
// then checks the winner's popup functions: my_awards() and mark_awards_seen().
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const here = (p) => new URL(p, import.meta.url);
const FIXTURE = readFileSync(here("./fixture.sql"), "utf8");
const EXTRA = `
create table private.admins (id uuid primary key);
create function public.is_admin() returns boolean language sql stable security definer set search_path = public, private as $$
  select exists (select 1 from private.admins where id = (select auth.uid()))
$$;
grant execute on function public.is_admin() to anon, authenticated;
`;
const AWARDS = readFileSync(here("../migrations/20261124130000_awards.sql"), "utf8");
const MIGRATION = readFileSync(here("../migrations/20261124140000_award_notices.sql"), "utf8");
const WHY = "Every level teaches one new trick with the water.";

async function setup() {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(EXTRA);
  await db.exec(AWARDS);
  await db.exec(MIGRATION);
  let n = 0;
  const one = async (sql, params) => (await db.query(sql, params)).rows[0];
  const as = (uid) => db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  const h = {
    db,
    one,
    as,
    async user(handle) {
      const { id } = await one("insert into auth.users (id) values (gen_random_uuid()) returning id");
      await db.query("insert into public.profiles (id, handle, display_name) values ($1, $2, $2)", [id, handle ?? `user${++n}`]);
      return id;
    },
    async game(owner, title = "Lantern Drift") {
      return (await one("insert into public.projects (owner_id, title, slug, published) values ($1, $2, $3, true) returning id", [owner, title, `g${++n}`])).id;
    },
    async award(pid) {
      const admin = await h.user();
      await db.query("insert into private.admins (id) values ($1)", [admin]);
      await as(admin);
      const { id } = await one("select public.admin_grant_award($1, 'best-of-playinweb', $2) as id", [pid, WHY]);
      await as(null);
      return { id, admin };
    },
    async mine(uid) {
      await as(uid);
      try {
        return (await db.query("select * from public.my_awards()")).rows;
      } finally {
        await as(null);
      }
    },
    async seen(uid, ids) {
      await as(uid);
      try {
        await db.query("select public.mark_awards_seen($1)", [ids]);
      } finally {
        await as(null);
      }
    },
  };
  return h;
}

test("the owner gets their new award once, with the game and award name, until they mark it seen", async () => {
  const h = await setup();
  const owner = await h.user("mira");
  const pid = await h.game(owner);
  const { id } = await h.award(pid);
  const rows = await h.mine(owner);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, id);
  assert.equal(rows[0].award_name, "Best of PlayInWeb");
  assert.equal(rows[0].title, "Lantern Drift");
  assert.equal(rows[0].owner_handle, "mira");
  assert.equal(rows[0].citation, WHY);
  await h.seen(owner, [id]);
  assert.deepEqual(await h.mine(owner), []);
  assert.ok((await h.one("select seen_at from public.award_grants where id = $1", [id])).seen_at);
});

test("nobody else sees or marks another owner's award", async () => {
  const h = await setup();
  const owner = await h.user();
  const other = await h.user();
  const { id } = await h.award(await h.game(owner));
  assert.deepEqual(await h.mine(other), []);
  await h.seen(other, [id]);
  assert.equal((await h.one("select seen_at from public.award_grants where id = $1", [id])).seen_at, null);
  assert.deepEqual(await h.mine(null), []);
});

test("a taken-back award never pops up", async () => {
  const h = await setup();
  const owner = await h.user();
  const { id, admin } = await h.award(await h.game(owner));
  await h.as(admin);
  await h.db.query("select public.admin_revoke_award($1, 'Broke the rules')", [id]);
  await h.as(null);
  assert.deepEqual(await h.mine(owner), []);
});

test("a curated game's award waits for its creator: the listed account gets no popup, the claimer does", async () => {
  const h = await setup();
  const listed = await h.user("listed");
  const pid = await h.game(listed);
  const { id } = await h.award(pid);
  assert.deepEqual(await h.mine(listed), []);
  const creator = await h.user();
  await h.db.query("update public.projects set owner_id = $1 where id = $2", [creator, pid]);
  const rows = await h.mine(creator);
  assert.deepEqual(rows.map((r) => r.id), [id]);
});

test("signed-out visitors cannot call either function, and running the migration again is safe", async () => {
  const h = await setup();
  await h.db.exec(MIGRATION);
  await h.db.exec("set role anon");
  await assert.rejects(h.db.query("select * from public.my_awards()"), /permission denied/);
  await assert.rejects(h.db.query("select public.mark_awards_seen('{}')"), /permission denied/);
  await h.db.exec("reset role");
});
