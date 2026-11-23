// Run with `npm test`. Applies the phone games batch (#38) to the test schema in PGlite.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const here = (p) => new URL(p, import.meta.url);
const read = (name) => readFileSync(here(`../migrations/${name}`), "utf8");
const FIXTURE = readFileSync(here("./fixture.sql"), "utf8");
const CONTROLS = read("20261114130000_project_controls.sql");
const MOBILE_READY = read("20261122120000_project_mobile_ready.sql");
const BATCH = read("20261122150000_curated_mobile_games.sql");

// The columns the batch writes that the small test schema leaves out.
const CATALOGUE_COLUMNS = `
  alter table public.projects
    add column tagline text, add column description text, add column genre text, add column kind text,
    add column release_status text, add column pricing_type text, add column community text,
    add column contains_ai boolean, add column play_url text, add column embeddable boolean,
    add column cover_path text,
    add constraint projects_owner_slug_key unique (owner_id, slug);
  alter table public.project_curation
    add column play_mode text, add column creator_url text, add column source_url text;
  create function public.is_admin() returns boolean language sql stable as $$ select false $$;
`;

async function setup() {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(CATALOGUE_COLUMNS);
  const owner = (await db.query("insert into auth.users (id) values (gen_random_uuid()) returning id")).rows[0].id;
  await db.query("insert into public.profiles (id, handle, display_name) values ($1, 'listed', 'Listed')", [owner]);
  await db.exec(CONTROLS);
  await db.exec(MOBILE_READY);
  await db.exec(BATCH);
  return { db, owner };
}

const games = (db) =>
  db.query(`
    select p.slug, p.title, p.play_url, p.cover_path, p.published, p.kind, p.controls, p.orientation, p.mobile_ready,
           c.status, c.play_mode, c.creator_name, c.source_url, c.license
    from public.projects p join public.project_curation c on c.project_id = p.id
    order by p.slug`);

test("adds 13 listed games, all Mobile ready with an orientation", async () => {
  const { db } = await setup();
  const { rows } = await games(db);
  assert.equal(rows.length, 13);
  for (const g of rows) {
    assert.equal(g.mobile_ready, true, g.slug);
    assert.ok(["portrait", "landscape"].includes(g.orientation), g.slug);
    assert.ok(g.controls.includes("touch"), `${g.slug} plays with touch`);
    assert.equal(g.published, true);
    assert.equal(g.kind, "external");
    assert.equal(g.status, "listed");
    assert.equal(g.play_mode, "embed");
    assert.equal(g.license, "Link only");
    assert.match(g.play_url, /^https:\/\/itch\.io\/embed-upload\/\d+\?color=000000$/, g.slug);
    assert.match(g.cover_path, /^https:\/\/img\.itch\.zone\//, g.slug);
    assert.match(g.source_url, /^https:\/\/[a-z0-9-]+\.itch\.io\//, g.slug);
    assert.ok(g.creator_name.length > 0);
  }
});

test("every game has its own embed", async () => {
  const { db } = await setup();
  const { rows } = await games(db);
  assert.equal(new Set(rows.map((g) => g.play_url)).size, rows.length);
});

test("safe to run twice, and leaves an admin's change alone", async () => {
  const { db } = await setup();
  await db.exec("update public.projects set mobile_ready = false where slug = 'zoo-ika'");
  await db.exec(BATCH);
  const { rows } = await games(db);
  assert.equal(rows.length, 13);
  assert.equal(rows.find((g) => g.slug === "zoo-ika").mobile_ready, false);
});

test("stops with a clear message when the mobile ready migration has not run", async () => {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(CATALOGUE_COLUMNS);
  const owner = (await db.query("insert into auth.users (id) values (gen_random_uuid()) returning id")).rows[0].id;
  await db.query("insert into public.profiles (id, handle, display_name) values ($1, 'listed', 'Listed')", [owner]);
  await assert.rejects(db.exec(BATCH), /Run 20261122120000_project_mobile_ready\.sql first/);
});
