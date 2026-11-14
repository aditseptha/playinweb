// Run with `npm test`. Applies the controls migration (#38) to the test schema in PGlite.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const here = (p) => new URL(p, import.meta.url);
const FIXTURE = readFileSync(here("./fixture.sql"), "utf8");
const MIGRATION = readFileSync(here("../migrations/20261114130000_project_controls.sql"), "utf8");

async function setup(before) {
  const db = new PGlite();
  await db.exec(FIXTURE);
  const owner = (await db.query("insert into auth.users (id) values (gen_random_uuid()) returning id")).rows[0].id;
  await db.query("insert into public.profiles (id, handle, display_name) values ($1, 'listed', 'Listed')", [owner]);
  if (before) await before(db, owner);
  await db.exec(MIGRATION);
  return { db, owner };
}

const seededId = () => {
  // The first curated game the migration seeds, with the controls it gives it.
  const m = MIGRATION.match(/update public\.projects set controls = array\[([^\]]+)\]::text\[\]\nwhere controls = '\{\}' and id in \(\n  '([0-9a-f-]{36})'/);
  return { controls: m[1].split(",").map((s) => s.trim().replace(/'/g, "")), id: m[2] };
};

test("new games start unchecked", async () => {
  const { db, owner } = await setup();
  const row = (await db.query("insert into public.projects (owner_id, title, slug) values ($1, 'G', 'g') returning controls", [owner])).rows[0];
  assert.deepEqual(row.controls, []);
});

test("only touch, keyboard, mouse and gamepad are allowed", async () => {
  const { db, owner } = await setup();
  await db.query("insert into public.projects (owner_id, title, slug, controls) values ($1, 'G', 'g', '{touch,mouse}')", [owner]);
  await assert.rejects(
    db.query("insert into public.projects (owner_id, title, slug, controls) values ($1, 'H', 'h', '{joystick}')", [owner]),
    /projects_controls_check/,
  );
});

test("the seed fills unchecked curated games and never overwrites an admin's choice", async () => {
  const { id, controls } = seededId();
  const other = "00000000-0000-4000-8000-000000000001";
  const { db } = await setup(async (pre, owner) => {
    await pre.query("insert into public.projects (id, owner_id, title, slug) values ($1, $2, 'Seeded', 'seeded')", [id, owner]);
    await pre.query("insert into public.projects (id, owner_id, title, slug) values ($1, $2, 'Other', 'other')", [other, owner]);
  });
  assert.deepEqual((await db.query("select controls from public.projects where id = $1", [id])).rows[0].controls, controls);
  assert.deepEqual((await db.query("select controls from public.projects where id = $1", [other])).rows[0].controls, []);

  // Running the migration again after an admin changed the game leaves the admin's value alone.
  await db.query("update public.projects set controls = '{touch}' where id = $1", [id]);
  await db.exec(MIGRATION);
  assert.deepEqual((await db.query("select controls from public.projects where id = $1", [id])).rows[0].controls, ["touch"]);
});
