// Run with `npm test`. Applies the awards migration (#30, PR 1) to the test schema in PGlite, then
// checks the seed, the admin RPCs and the access rules.
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
const MIGRATION = readFileSync(here("../migrations/20261124130000_awards.sql"), "utf8");
const BEST = "best-of-playinweb";
const WHY = "Every level teaches one new trick with the water.";

async function setup() {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(EXTRA);
  await db.exec(MIGRATION);
  let n = 0;
  const one = async (sql, params) => (await db.query(sql, params)).rows[0];
  const h = {
    db,
    one,
    async user() {
      const { id } = await one("insert into auth.users (id) values (gen_random_uuid()) returning id");
      await db.query("insert into public.profiles (id, handle, display_name) values ($1, $2, $2)", [id, `user${++n}`]);
      return id;
    },
    async admin() {
      const id = await h.user();
      await db.query("insert into private.admins (id) values ($1)", [id]);
      return id;
    },
    async game(fields = {}) {
      const owner = await h.user();
      const row = await one("insert into public.projects (owner_id, title, slug, published) values ($1, 'Game', $2, $3) returning id", [
        owner,
        `g${++n}`,
        fields.published ?? true,
      ]);
      return row.id;
    },
    as: (uid) => db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]),
    async grant(uid, pid, citation = WHY, award = BEST) {
      await h.as(uid);
      try {
        return (await one("select public.admin_grant_award($1, $2, $3) as id", [pid, award, citation])).id;
      } finally {
        await h.as(null);
      }
    },
    async revoke(uid, id, reason = "Broke the rules") {
      await h.as(uid);
      try {
        await db.query("select public.admin_revoke_award($1, $2)", [id, reason]);
      } finally {
        await h.as(null);
      }
    },
  };
  return h;
}

test("Best of PlayInWeb is seeded with its text and Sunburst medal, and running the migration again keeps it", async () => {
  const h = await setup();
  const award = await h.one("select * from public.award_types where slug = $1", [BEST]);
  assert.equal(award.name, "Best of PlayInWeb");
  assert.ok(award.description.length > 10);
  assert.ok(award.how_chosen.includes("nothing to enter"));
  assert.equal(award.medal.shape, "sun");
  assert.equal(award.medal.top, "Best of");
  await h.db.exec(MIGRATION);
  assert.equal((await h.one("select count(*)::int as n from public.award_types")).n, 1);
});

test("only admins can give an award", async () => {
  const h = await setup();
  const pid = await h.game();
  await assert.rejects(h.grant(await h.user(), pid), /not allowed/);
  await assert.rejects(h.grant(null, pid), /not allowed/);
});

test("an admin gives an award: saved with the citation, who gave it and when", async () => {
  const h = await setup();
  const admin = await h.admin();
  const pid = await h.game();
  const id = await h.grant(admin, pid, `  ${WHY}  `);
  const row = await h.one("select * from public.award_grants where id = $1", [id]);
  assert.equal(row.award_slug, BEST);
  assert.equal(row.project_id, pid);
  assert.equal(row.citation, WHY);
  assert.equal(row.awarded_by, admin);
  assert.ok(row.awarded_at);
  assert.equal(row.revoked_at, null);
  assert.equal(row.seen_at, null);
});

test("an award needs a published game, a known award and a citation of 10 to 400 characters", async () => {
  const h = await setup();
  const admin = await h.admin();
  await assert.rejects(h.grant(admin, await h.game({ published: false })), /only published games/);
  const pid = await h.game();
  await assert.rejects(h.grant(admin, pid, WHY, "game-of-the-year"), /unknown award/);
  await assert.rejects(h.grant(admin, pid, "Great"), /10 to 400/);
  await assert.rejects(h.grant(admin, pid, "x".repeat(401)), /10 to 400/);
});

test("a game holds an award once; after it is revoked it can be given again", async () => {
  const h = await setup();
  const admin = await h.admin();
  const pid = await h.game();
  const first = await h.grant(admin, pid);
  await assert.rejects(h.grant(admin, pid), /already has this award/);
  await h.revoke(admin, first, "Mistake, wrong game");
  const second = await h.grant(admin, pid);
  assert.notEqual(second, first);
});

test("revoking needs an admin and a reason, and keeps the row with who and why", async () => {
  const h = await setup();
  const admin = await h.admin();
  const id = await h.grant(admin, await h.game());
  await assert.rejects(h.revoke(await h.user(), id), /not allowed/);
  await assert.rejects(h.revoke(admin, id, " "), /say why/);
  await h.revoke(admin, id, "Copied from another game");
  const row = await h.one("select revoked_at, revoked_by, revoke_reason from public.award_grants where id = $1", [id]);
  assert.ok(row.revoked_at);
  assert.equal(row.revoked_by, admin);
  assert.equal(row.revoke_reason, "Copied from another game");
  await assert.rejects(h.revoke(admin, id), /already revoked/);
});

test("everyone sees standing awards, only admins see revoked ones, nobody writes directly", async () => {
  const h = await setup();
  const admin = await h.admin();
  const standing = await h.game();
  const taken = await h.game();
  await h.grant(admin, standing);
  await h.revoke(admin, await h.grant(admin, taken));

  const count = async (uid, role) => {
    await h.as(uid);
    await h.db.exec(`set role ${role}`);
    try {
      return (await h.db.query("select count(*)::int as n from public.award_grants")).rows[0].n;
    } finally {
      await h.db.exec("reset role");
      await h.as(null);
    }
  };
  assert.equal(await count(null, "anon"), 1);
  assert.equal(await count(await h.user(), "authenticated"), 1);
  assert.equal(await count(admin, "authenticated"), 2);

  await h.as(admin);
  await h.db.exec("set role authenticated");
  await assert.rejects(
    h.db.query("insert into public.award_grants (award_slug, project_id, citation) values ($1, $2, $3)", [BEST, standing, WHY]),
    /permission denied/,
  );
  await assert.rejects(h.db.query("update public.award_types set name = 'X'"), /permission denied/);
  await h.db.exec("reset role");
  await h.as(null);
});
