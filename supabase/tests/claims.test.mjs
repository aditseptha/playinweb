// Run with `npm test`. Applies the claim requests migration (#30, PR 0) to the test schema in PGlite,
// with the slug redirect and badge migrations it works with, then checks the RPCs and access rules.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const here = (p) => new URL(p, import.meta.url);
const read = (p) => readFileSync(here(p), "utf8");
const FIXTURE = read("./fixture.sql");
// What the claim migration needs beyond the shared fixture: the community column, admins, auth.jwt().
const EXTRA = `
alter table public.projects add column community text not null default 'comments';
alter table public.projects add constraint projects_owner_slug unique (owner_id, slug);
create table private.admins (id uuid primary key);
create function public.is_admin() returns boolean language sql stable security definer set search_path = public, private as $$
  select exists (select 1 from private.admins where id = (select auth.uid()))
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant execute on function public.is_admin() to authenticated;
grant execute on function auth.jwt() to authenticated;
`;
const MIGRATIONS = [
  "../migrations/20261110120000_project_slug_redirects.sql",
  "../migrations/20261113120000_profile_badges.sql",
  "../migrations/20261114100000_badge_celebrations.sql",
  "../migrations/20261124120000_project_claims.sql",
].map(read);

async function setup() {
  const db = new PGlite();
  await db.exec(FIXTURE);
  await db.exec(EXTRA);
  for (const sql of MIGRATIONS) await db.exec(sql);
  let n = 0;
  const one = async (sql, params) => (await db.query(sql, params)).rows[0];
  const h = {
    db,
    one,
    async user(handle = `user${++n}`) {
      const { id } = await one("insert into auth.users (id) values (gen_random_uuid()) returning id");
      await db.query("insert into public.profiles (id, handle, display_name) values ($1, $2, $2)", [id, handle]);
      return id;
    },
    async admin() {
      const id = await h.user();
      await db.query("insert into private.admins (id) values ($1)", [id]);
      return id;
    },
    as(uid, email = "") {
      return db.query(
        "select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)",
        [uid ?? "", uid ? JSON.stringify({ sub: uid, email }) : ""],
      );
    },
    async curated(slug = `curated${++n}`) {
      const { id } = await one(
        "insert into public.projects (owner_id, title, slug, community) values ($1, 'Curated', $2, 'disabled') returning id",
        [h.listed, slug],
      );
      await db.query("insert into public.project_curation (project_id) values ($1)", [id]);
      return id;
    },
    async submit(uid, pid, evidence = "My itch.io page links to it", email = "me@example.com") {
      await h.as(uid, email);
      try {
        return (await one("select public.submit_claim($1, $2) as id", [pid, evidence])).id;
      } finally {
        await h.as(null);
      }
    },
    async decide(adminId, claimId, approve, note = null) {
      await h.as(adminId);
      try {
        return await one("select * from public.admin_decide_claim($1, $2, $3)", [claimId, approve, note]);
      } finally {
        await h.as(null);
      }
    },
    status: async (pid) => (await one("select status from public.project_curation where project_id = $1", [pid])).status,
    claim: (id) => one("select * from public.project_claims where id = $1", [id]),
  };
  h.listed = await h.user("listed");
  return h;
}

test("sending a claim needs a signed-in account", async () => {
  const h = await setup();
  const pid = await h.curated();
  await assert.rejects(h.db.query("select public.submit_claim($1, 'It is my game, see my site')", [pid]), /sign in/);
});

test("a claim is saved as pending, with the sign-in email, and marks the game claim_pending", async () => {
  const h = await setup();
  const creator = await h.user();
  const pid = await h.curated();
  const id = await h.submit(creator, pid, "  The game page on itch.io is mine  ", "maker@example.com");
  const claim = await h.claim(id);
  assert.equal(claim.status, "pending");
  assert.equal(claim.email, "maker@example.com");
  assert.equal(claim.evidence, "The game page on itch.io is mine");
  assert.equal(await h.status(pid), "claim_pending");
});

test("only curated games that are not claimed yet can be claimed", async () => {
  const h = await setup();
  const creator = await h.user();
  const other = await h.user();
  const ownGame = (await h.one("insert into public.projects (owner_id, title, slug) values ($1, 'Mine', 'mine') returning id", [other])).id;
  await assert.rejects(h.submit(creator, ownGame), /cannot be claimed/);

  const pid = await h.curated();
  await h.db.query("update public.project_curation set status = 'claimed' where project_id = $1", [pid]);
  await assert.rejects(h.submit(creator, pid), /cannot be claimed/);
});

test("one waiting claim per person per game, and evidence is required", async () => {
  const h = await setup();
  const creator = await h.user();
  const pid = await h.curated();
  await assert.rejects(h.submit(creator, pid, "mine"), /confirm the game is yours/);
  await h.submit(creator, pid);
  await assert.rejects(h.submit(creator, pid), /already have a claim waiting/);
  // Someone else may still claim the same game.
  await h.submit(await h.user(), pid);
});

test("no more than five waiting claims per person", async () => {
  const h = await setup();
  const creator = await h.user();
  for (let i = 0; i < 5; i++) await h.submit(creator, await h.curated());
  await assert.rejects(h.submit(creator, await h.curated()), /too many claims/);
});

test("only admins can decide a claim", async () => {
  const h = await setup();
  const creator = await h.user();
  const id = await h.submit(creator, await h.curated());
  await assert.rejects(h.decide(creator, id, true), /not allowed/);
  await assert.rejects(h.decide(null, id, true), /not allowed/);
});

test("approving moves the game to the claimant, opens comments, keeps the old address and gives Claimed", async () => {
  const h = await setup();
  const admin = await h.admin();
  const creator = await h.user("kai");
  const rival = await h.user();
  const pid = await h.curated("orbit-mail");
  const id = await h.submit(creator, pid);
  const rivalClaim = await h.submit(rival, pid);

  const result = await h.decide(admin, id, true, "Matched the itch.io account");
  assert.deepEqual(result, { owner_handle: "kai", slug: "orbit-mail" });

  const game = await h.one("select owner_id, slug, community from public.projects where id = $1", [pid]);
  assert.equal(game.owner_id, creator);
  assert.equal(game.slug, "orbit-mail");
  assert.equal(game.community, "comments");
  assert.equal(await h.status(pid), "claimed");

  const approved = await h.claim(id);
  assert.equal(approved.status, "approved");
  assert.equal(approved.decision_note, "Matched the itch.io account");
  assert.equal(approved.decided_by, admin);
  assert.equal((await h.claim(rivalClaim)).status, "rejected");

  const redirect = await h.one("select project_id from public.project_slug_redirects where owner_id = $1 and slug = 'orbit-mail'", [h.listed]);
  assert.equal(redirect.project_id, pid);

  const badge = await h.one("select level from public.profile_badges where profile_id = $1 and badge = 'claimed'", [creator]);
  assert.equal(badge?.level, 1);

  await assert.rejects(h.decide(admin, id, true), /already decided/);
});

test("approving picks a free slug when the claimant already has one with the same name", async () => {
  const h = await setup();
  const admin = await h.admin();
  const creator = await h.user();
  await h.db.query("insert into public.projects (owner_id, title, slug) values ($1, 'Mine', 'orbit-mail'), ($1, 'Mine 2', 'orbit-mail-2')", [creator]);
  const pid = await h.curated("orbit-mail");
  const result = await h.decide(admin, await h.submit(creator, pid), true);
  assert.equal(result.slug, "orbit-mail-3");
});

test("rejecting puts the game back to listed, unless someone else is still waiting", async () => {
  const h = await setup();
  const admin = await h.admin();
  const pid = await h.curated();
  const first = await h.submit(await h.user(), pid);
  const second = await h.submit(await h.user(), pid);

  assert.deepEqual(await h.decide(admin, first, false, "No link to the game"), undefined);
  assert.equal((await h.claim(first)).status, "rejected");
  assert.equal((await h.claim(first)).decision_note, "No link to the game");
  assert.equal(await h.status(pid), "claim_pending");

  await h.decide(admin, second, false);
  assert.equal(await h.status(pid), "listed");
  const game = await h.one("select owner_id from public.projects where id = $1", [pid]);
  assert.equal(game.owner_id, h.listed);
});

test("claimants see their own claims, admins see all, nobody writes to the table directly", async () => {
  const h = await setup();
  const admin = await h.admin();
  const creator = await h.user();
  const stranger = await h.user();
  const pid = await h.curated();
  await h.submit(creator, pid);

  const visible = async (uid) => {
    await h.as(uid);
    await h.db.exec("set role authenticated");
    try {
      return (await h.db.query("select count(*)::int as n from public.project_claims")).rows[0].n;
    } finally {
      await h.db.exec("reset role");
      await h.as(null);
    }
  };
  assert.equal(await visible(creator), 1);
  assert.equal(await visible(stranger), 0);
  assert.equal(await visible(admin), 1);

  await h.as(creator);
  await h.db.exec("set role authenticated");
  await assert.rejects(
    h.db.query("insert into public.project_claims (project_id, claimant_id, evidence) values ($1, $2, 'It is mine, honestly')", [pid, creator]),
    /permission denied/,
  );
  await assert.rejects(h.db.query("update public.project_claims set status = 'approved'"), /permission denied/);
  await h.db.exec("reset role");
  await h.as(null);
});
