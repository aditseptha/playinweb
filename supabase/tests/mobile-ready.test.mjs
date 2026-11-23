// Run with `npm test`. Applies the mobile ready migration (#38) to the test schema in PGlite.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const here = (p) => new URL(p, import.meta.url);
const FIXTURE = readFileSync(here("./fixture.sql"), "utf8");
const MIGRATION = readFileSync(here("../migrations/20261122120000_project_mobile_ready.sql"), "utf8");

// The fixture has no admins; production's is_admin() reads private.admins by email. Here an admin
// is any user id listed in private.test_admins.
const ADMIN_STUB = `
  create table private.test_admins (id uuid primary key);
  create function public.is_admin() returns boolean language sql stable security definer
    set search_path = public, private as $$
    select exists (select 1 from private.test_admins where id = auth.uid())
  $$;
  grant execute on function public.is_admin() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  grant select, insert, update on public.projects to authenticated;
`;

async function setup() {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(ADMIN_STUB);
  await db.exec(MIGRATION);
  const one = async (sql, params) => (await db.query(sql, params)).rows[0];
  const user = async () => (await one("insert into auth.users (id) values (gen_random_uuid()) returning id")).id;
  const creator = await user();
  await db.query("insert into public.profiles (id, handle, display_name) values ($1, 'maker', 'Maker')", [creator]);
  const admin = await user();
  await db.query("insert into private.test_admins (id) values ($1)", [admin]);
  /** Run `fn` as a signed-in user through the authenticated role, as the site does. */
  const as = async (id, fn) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);`);
    try {
      return await fn();
    } finally {
      await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
    }
  };
  const game = async () => (await one("insert into public.projects (owner_id, title, slug) values ($1, 'G', 'g') returning id", [creator])).id;
  const ready = async (id) => (await one("select mobile_ready from public.projects where id = $1", [id])).mobile_ready;
  return { db, one, as, creator, admin, game, ready };
}

test("new games start not mobile ready, with no orientation", async () => {
  const { one, creator } = await setup();
  const row = await one("insert into public.projects (owner_id, title, slug) values ($1, 'G', 'g') returning mobile_ready, orientation", [creator]);
  assert.equal(row.mobile_ready, false);
  assert.equal(row.orientation, null);
});

test("orientation is portrait, landscape, any or unset", async () => {
  const { db, creator } = await setup();
  for (const [i, o] of ["portrait", "landscape", "any"].entries()) {
    await db.query("insert into public.projects (owner_id, title, slug, orientation) values ($1, 'G', $2, $3)", [creator, `g${i}`, o]);
  }
  await assert.rejects(
    db.query("insert into public.projects (owner_id, title, slug, orientation) values ($1, 'H', 'h', 'sideways')", [creator]),
    /projects_orientation_check/,
  );
});

test("a creator cannot mark their own game mobile ready, but the rest of their change saves", async () => {
  const { db, as, creator, game, ready, one } = await setup();
  const id = await game();
  await as(creator, () => db.query("update public.projects set mobile_ready = true, orientation = 'portrait' where id = $1", [id]));
  assert.equal(await ready(id), false);
  assert.equal((await one("select orientation from public.projects where id = $1", [id])).orientation, "portrait");

  // Nor on insert.
  const row = await as(creator, () =>
    one("insert into public.projects (owner_id, title, slug, mobile_ready) values ($1, 'H', 'h', true) returning mobile_ready", [creator]),
  );
  assert.equal(row.mobile_ready, false);
});

test("a creator saving the form does not undo an admin's mark", async () => {
  const { db, as, admin, creator, game, ready } = await setup();
  const id = await game();
  await as(admin, () => db.query("update public.projects set mobile_ready = true where id = $1", [id]));
  assert.equal(await ready(id), true);
  await as(creator, () => db.query("update public.projects set mobile_ready = false, title = 'Renamed' where id = $1", [id]));
  assert.equal(await ready(id), true);
});

test("an admin can mark and unmark a game", async () => {
  const { db, as, admin, game, ready } = await setup();
  const id = await game();
  await as(admin, () => db.query("update public.projects set mobile_ready = true where id = $1", [id]));
  assert.equal(await ready(id), true);
  await as(admin, () => db.query("update public.projects set mobile_ready = false where id = $1", [id]));
  assert.equal(await ready(id), false);
});

test("a migration (not the site's roles) can mark a batch of tested games", async () => {
  const { db, game, ready } = await setup();
  const id = await game();
  await db.query("update public.projects set mobile_ready = true where id = $1", [id]);
  assert.equal(await ready(id), true);
});

test("running the migration again keeps every mark", async () => {
  const { db, game, ready } = await setup();
  const id = await game();
  await db.query("update public.projects set mobile_ready = true where id = $1", [id]);
  await db.exec(MIGRATION);
  assert.equal(await ready(id), true);
});
