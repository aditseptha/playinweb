// Run with `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { DEVLOG, buildId, currentRelease, devlogProblems, releaseAnchor } = await import("./devlog.ts");
const { RESERVED_HANDLES, isHandle } = await import("./host.ts");

const release = (version, date, items = [{ kind: "new", text: "Something" }]) => ({ version, date, title: `Release ${version}`, items });

test("the devlog is well formed", () => {
  assert.deepEqual(devlogProblems(DEVLOG), []);
});

test("the footer version is the newest release", () => {
  assert.equal(currentRelease(), DEVLOG[0]);
  assert.equal(currentRelease([release("0.9", "2026-12-01"), release("0.8", "2026-11-20")]).version, "0.9");
});

test("devlogProblems catches releases in the wrong order", () => {
  const problems = devlogProblems([release("0.4", "2026-11-10"), release("0.5", "2026-11-12")]);
  assert.ok(problems.some((p) => p.includes("must be newer than v0.5")));
  assert.ok(problems.some((p) => p.includes("date is older than v0.5")));
});

test("devlogProblems catches bad versions, dates, kinds and empty text", () => {
  const problems = devlogProblems([
    { version: "1.0.0", date: "13/11/2026", title: " ", items: [{ kind: "changed", text: "" }] },
  ]);
  assert.ok(problems.some((p) => p.includes("version must look like 0.N")));
  assert.ok(problems.some((p) => p.includes("date must be YYYY-MM-DD")));
  assert.ok(problems.some((p) => p.includes("title is empty")));
  assert.ok(problems.some((p) => p.includes('unknown kind "changed"')));
  assert.ok(problems.some((p) => p.includes("an item has no text")));
  assert.deepEqual(devlogProblems([]), ["The devlog needs at least one release."]);
  assert.ok(devlogProblems([release("0.2", "2026-11-10", [])]).some((p) => p.includes("no items")));
});

test("versions compare as numbers, so v0.10 comes after v0.9", () => {
  assert.deepEqual(devlogProblems([release("0.10", "2026-12-02"), release("0.9", "2026-12-01")]), []);
});

test("releaseAnchor and buildId", () => {
  assert.equal(releaseAnchor("0.12"), "v0-12");
  assert.equal(buildId("2004d738521cdabe42f8a1f31d0baa84223aa2cd"), "2004d73");
  assert.equal(buildId("ABCDEF1"), "abcdef1");
  assert.equal(buildId(""), null);
  assert.equal(buildId(undefined), null);
  assert.equal(buildId("not-a-sha"), null);
});

test("devlog and devlogs are reserved handles, in the app and in the database", () => {
  for (const h of ["devlog", "devlogs"]) {
    assert.ok(RESERVED_HANDLES.has(h), h);
    assert.equal(isHandle(h), false, h);
  }
  const sql = readFileSync(new URL("../supabase/migrations/20261114120000_reserve_devlog_handle.sql", import.meta.url), "utf8");
  assert.match(sql, /check \(handle not in \('devlog', 'devlogs'\)\)/);
});
