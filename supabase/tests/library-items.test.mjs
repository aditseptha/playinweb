// Run with `npm test`. Applies the account Library migration (#38) to the test schema in PGlite.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const here = (p) => new URL(p, import.meta.url);
const FIXTURE = readFileSync(here("./fixture.sql"), "utf8");
const MIGRATION = readFileSync(here("../migrations/20261122130000_library_items.sql"), "utf8");

async function setup() {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec("grant usage on schema public to anon, authenticated;");
  await db.exec(MIGRATION);
  const one = async (sql, params) => (await db.query(sql, params)).rows[0];
  const user = async (handle) => {
    const { id } = await one("insert into auth.users (id) values (gen_random_uuid()) returning id");
    await db.query("insert into public.profiles (id, handle, display_name) values ($1, $2, $2)", [id, handle]);
    return id;
  };
  const ana = await user("ana");
  const ben = await user("ben");
  const game = async (slug) =>
    (await one("insert into public.projects (owner_id, title, slug) values ($1, 'G', $2) returning id", [ana, slug])).id;
  /** Run `fn` as a signed-in player through the authenticated role, as the site does. */
  const as = async (id, fn) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`);
    try {
      return await fn();
    } finally {
      await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
    }
  };
  const rows = (id) => as(id, async () => (await db.query("select project_id from public.library_items order by created_at")).rows);
  return { db, as, ana, ben, game, rows };
}

test("a player saves and removes games in their own Library", async () => {
  const { db, as, ana, game, rows } = await setup();
  const g = await game("g");
  await as(ana, () => db.query("insert into public.library_items (user_id, project_id) values ($1, $2)", [ana, g]));
  assert.deepEqual((await rows(ana)).map((r) => r.project_id), [g]);
  await as(ana, () => db.query("delete from public.library_items where project_id = $1", [g]));
  assert.deepEqual(await rows(ana), []);
});

test("a game is saved once per player", async () => {
  const { db, as, ana, game } = await setup();
  const g = await game("g");
  await as(ana, () => db.query("insert into public.library_items (user_id, project_id) values ($1, $2)", [ana, g]));
  await assert.rejects(
    as(ana, () => db.query("insert into public.library_items (user_id, project_id) values ($1, $2)", [ana, g])),
    /library_items_pkey/,
  );
});

test("nobody reads, adds to or empties another player's Library", async () => {
  const { db, as, ana, ben, game, rows } = await setup();
  const g = await game("g");
  await as(ana, () => db.query("insert into public.library_items (user_id, project_id) values ($1, $2)", [ana, g]));

  assert.deepEqual(await rows(ben), [], "Ben sees none of Ana's games");
  await assert.rejects(
    as(ben, () => db.query("insert into public.library_items (user_id, project_id) values ($1, $2)", [ana, g])),
    /row-level security/,
  );
  await as(ben, () => db.query("delete from public.library_items where user_id = $1", [ana]));
  assert.equal((await rows(ana)).length, 1, "Ben's delete removed nothing");
});

test("a deleted game leaves every Library", async () => {
  const { db, as, ana, game, rows } = await setup();
  const g = await game("g");
  await as(ana, () => db.query("insert into public.library_items (user_id, project_id) values ($1, $2)", [ana, g]));
  await db.query("delete from public.projects where id = $1", [g]);
  assert.deepEqual(await rows(ana), []);
});

test("running the migration again keeps every saved game", async () => {
  const { db, as, ana, game, rows } = await setup();
  const g = await game("g");
  await as(ana, () => db.query("insert into public.library_items (user_id, project_id) values ($1, $2)", [ana, g]));
  await db.exec(MIGRATION);
  assert.equal((await rows(ana)).length, 1);
});
