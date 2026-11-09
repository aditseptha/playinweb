// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

const { moreFromCreator, similarGames } = await import("./related-games.ts");

const g = (id, handle, tags, playCount) => ({ id, channelHandle: handle, developer: handle, tags, playCount });

const current = g("ayam", "kikiew", ["Arcade", "Comedy"], 100);
const games = [
  current,
  g("bus", "kikiew", ["Horror"], 50),
  g("kos", "kikiew", ["Arcade"], 90),
  g("fox", "kitsune", ["arcade"], 10),
  g("ferry", "rumah", ["Comedy", "Arcade"], 5),
  g("lake", "nara", ["Story"], 999),
  g("crab", "pantai", ["Comedy"], 40),
];

test("moreFromCreator lists the creator's other games, most played first", () => {
  assert.deepEqual(moreFromCreator(games, current).map((x) => x.id), ["kos", "bus"]);
});

test("similarGames skips the creator's own games and needs a shared tag", () => {
  const out = similarGames(games, current);
  assert.equal(out.kind, "similar");
  // ferry shares two tags; crab and fox share one (fox matches case-insensitively), by plays.
  assert.deepEqual(out.games.map((x) => x.id), ["ferry", "crab", "fox"]);
});

test("similarGames falls back to popular games when too few match", () => {
  const out = similarGames(games, { ...current, tags: ["Story"] });
  assert.equal(out.kind, "popular");
  assert.deepEqual(out.games.map((x) => x.id), ["lake", "crab", "fox", "ferry"]);
});

test("same creator falls back to the developer name when there is no handle", () => {
  const local = { id: "x", developer: "Solo", tags: [], playCount: 0 };
  const list = [local, { id: "y", developer: "Solo", tags: [], playCount: 1 }];
  assert.deepEqual(moreFromCreator(list, local).map((x) => x.id), ["y"]);
});
