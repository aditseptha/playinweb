// Run with `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const { BADGES, badgeBoard, badgeDef, levelFor, levelLabel, progressLabel, stripeCount, tierFor } = await import("./badges.ts");
const { BADGE_SHAPES, clip, contains, inset, isConvex, signedArea, stripes } = await import("./badge-shapes.ts");

const def = (id) => badgeDef(id);

test("the catalogue has 11 badges with unique ids", () => {
  assert.equal(BADGES.length, 11);
  assert.equal(new Set(BADGES.map((d) => d.id)).size, 11);
});

test("thresholds match the SQL migration", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261113120000_profile_badges.sql", import.meta.url), "utf8");
  const body = sql.slice(sql.indexOf("private.badge_thresholds()"), sql.indexOf("private.badge_metrics("));
  const fromSql = Object.fromEntries(
    [...body.matchAll(/\('(\w+)', array\[([\d,\s]+)\]\)/g)].map(([, id, list]) => [id, list.split(",").map((n) => Number(n.trim()))]),
  );
  const fromLib = Object.fromEntries(BADGES.map((d) => [d.id, [...d.thresholds]]));
  assert.deepEqual(fromSql, fromLib);
  // The table's check constraint lists the same ids.
  for (const d of BADGES) assert.match(sql, new RegExp(`'${d.id}'`));
});

test("levelFor counts the thresholds a value meets", () => {
  const fan = def("fan");
  assert.equal(levelFor(fan, 0), 0);
  assert.equal(levelFor(fan, 9), 0);
  assert.equal(levelFor(fan, 10), 1);
  assert.equal(levelFor(fan, 499), 2);
  assert.equal(levelFor(fan, 500), 3);
  assert.equal(levelFor(fan, 1_000_000), 3);
  assert.equal(levelFor(def("complete"), 1), 1);
});

test("tierFor maps levels to metals, Foil and locked", () => {
  assert.equal(tierFor(def("fan"), 0), "locked");
  assert.equal(tierFor(def("fan"), 1), "bronze");
  assert.equal(tierFor(def("fan"), 2), "silver");
  assert.equal(tierFor(def("fan"), 3), "gold");
  assert.equal(tierFor(def("complete"), 1), "gold");
  assert.equal(tierFor(def("earlybird"), 1), "foil");
  assert.equal(tierFor(def("earlybird"), 0), "locked");
});

test("stripeCount draws one stripe per level, three on Foil, none on single or locked badges", () => {
  assert.deepEqual([0, 1, 2, 3].map((l) => stripeCount(def("explorer"), l)), [0, 1, 2, 3]);
  assert.equal(stripeCount(def("claimed"), 1), 3);
  assert.equal(stripeCount(def("complete"), 1), 0);
});

test("levelLabel names the level under each badge", () => {
  assert.equal(levelLabel(def("fan"), 0), "Locked");
  assert.equal(levelLabel(def("fan"), 2), "Lv 2");
  assert.equal(levelLabel(def("complete"), 1), "Earned");
  assert.equal(levelLabel(def("earlybird"), 1), "Foil");
});

test("progressLabel says how far the next level is", () => {
  assert.equal(progressLabel(def("following"), 1, 86), "86 / 100 followers to Lv 2");
  assert.equal(progressLabel(def("crowd"), 1, 820), "820 / 1K players to Lv 2");
  assert.equal(progressLabel(def("explorer"), 0, 1), "1 / 3 games played to unlock");
  assert.equal(progressLabel(def("fan"), 3, 612), "Max level · 612 likes");
});

test("progressLabel caps progress at the next threshold when a level lags behind", () => {
  // A revoked badge shows level 0 while its live count is already past Lv1.
  assert.equal(progressLabel(def("fan"), 0, 12), "10 / 10 likes to unlock");
});

test("progressLabel hides private numbers and explains locked one-off badges", () => {
  assert.equal(progressLabel(def("supporter"), 0, null), "Donate to a game or tip PlayInWeb");
  assert.equal(progressLabel(def("supporter"), 2, null), "Lv 2 of 3");
  assert.equal(progressLabel(def("supporter"), 3, null), "Max level");
  assert.equal(progressLabel(def("complete"), 0, 0), "Add an avatar, a banner and a bio");
  assert.equal(progressLabel(def("claimed"), 1, 1), "Earned");
});

test("badgeBoard lists every badge in catalogue order and fills gaps as locked", () => {
  const board = badgeBoard([
    { badge: "fan", level: 2, earned_at: "2026-11-01T00:00:00Z", progress: 150 },
    { badge: "unknown", level: 3, earned_at: null, progress: 1 },
    { badge: "complete", level: 9, earned_at: null, progress: 1 },
  ]);
  assert.deepEqual(board.map((b) => b.def.id), BADGES.map((d) => d.id));
  const fan = board.find((b) => b.def.id === "fan");
  assert.deepEqual([fan.level, fan.progress, fan.earnedAt], [2, 150, "2026-11-01T00:00:00Z"]);
  assert.equal(board.find((b) => b.def.id === "complete").level, 1);
  assert.deepEqual(board.find((b) => b.def.id === "explorer"), { def: def("explorer"), level: 0, progress: null, earnedAt: null });
  assert.equal(badgeBoard(null).length, 11);
});

test("every badge has a shape", () => {
  for (const d of BADGES) assert.ok(BADGE_SHAPES[d.id], d.id);
});

test("shapes stay inside the camera frame and their holes sit inside their parts", () => {
  for (const [id, shape] of Object.entries(BADGE_SHAPES)) {
    for (const p of shape.parts) {
      assert.ok(p.outer.length >= 3, id);
      assert.notEqual(signedArea(p.outer), 0, id);
      for (const [x, y] of p.outer) assert.ok(Math.abs(x) <= 1.1 && Math.abs(y) <= 1.15, `${id} point ${x},${y}`);
      for (const hole of p.holes) {
        for (const pt of hole) assert.ok(contains(p.outer, pt), `${id}: hole point ${pt} outside its part`);
      }
    }
  }
});

test("stripe regions are convex and sit in the open space of the main frame", () => {
  for (const [id, shape] of Object.entries(BADGE_SHAPES)) {
    assert.ok(isConvex(shape.stripe.region), `${id} stripe region is not convex`);
    const frame = shape.parts[0];
    const center = shape.stripe.region.reduce((s, [x, y]) => [s[0] + x / shape.stripe.region.length, s[1] + y / shape.stripe.region.length], [0, 0]);
    const solid = contains(frame.outer, center) && !frame.holes.some((h) => contains(h, center));
    assert.ok(!solid, `${id} stripes would sit inside the solid frame`);
  }
});

test("inset shrinks a convex region evenly, even with edges shorter than the inset", () => {
  const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  assert.ok(Math.abs(Math.abs(signedArea(inset(square, 0.25))) - 2.25) < 1e-9);
  // A half disc of 21 points has 0.056-long edges, shorter than the 0.075 inset.
  const half = Array.from({ length: 21 }, (_, i) => [Math.cos((Math.PI * i) / 20) * 0.36, 0.08 + Math.sin((Math.PI * i) / 20) * 0.36]);
  const shrunk = inset(half, 0.075);
  assert.ok(isConvex(shrunk));
  for (const pt of shrunk) {
    assert.ok(contains(half, pt));
    assert.ok(pt[1] >= 0.08 + 0.075 - 1e-9);
    assert.ok(Math.hypot(pt[0], pt[1] - 0.08) <= 0.36 - 0.075 + 1e-9);
  }
});

test("every badge fits three stripes, each inside its region", () => {
  for (const [id, shape] of Object.entries(BADGE_SHAPES)) {
    for (const count of [1, 2, 3]) {
      const pieces = stripes(shape.stripe, count);
      assert.equal(pieces.length, count, `${id} with ${count} stripes`);
      for (const piece of pieces) {
        assert.ok(Math.abs(signedArea(piece)) > 0.004, `${id}: a stripe is a sliver`);
        for (const pt of piece) assert.ok(contains(shape.stripe.region, pt), `${id}: stripe leaves its region`);
      }
    }
  }
});

test("clip keeps a polygon that is already inside the region", () => {
  const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const small = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  assert.equal(Math.abs(signedArea(clip(small, square))), 1);
  assert.equal(clip([[2, 2], [3, 2], [3, 3]], square).length, 0);
});
