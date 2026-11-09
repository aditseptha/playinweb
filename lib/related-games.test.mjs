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

test("curated games group by their original creator, not the shared listed account", () => {
  const c = (id, developer, tags, playCount) => ({ id, channelHandle: "listed", developer, tags, playCount, curated: {} });
  const twoK = c("2048", "Gabriele Cirulli", ["Puzzle"], 900);
  const pool = [
    twoK,
    c("hextris", "Logan Engstrom", ["Puzzle"], 500),
    c("radius", "Jack Rugile", ["Shooter"], 300),
    c("spacepi", "Jack Rugile", ["Shooter"], 200),
    g("kikiew-puzzle", "kikiew", ["Puzzle"], 100),
  ];
  assert.deepEqual(moreFromCreator(pool, twoK).map((x) => x.id), []);
  assert.deepEqual(moreFromCreator(pool, pool[2]).map((x) => x.id), ["spacepi"]);
  // Other curated creators and own creators count as different creators.
  assert.deepEqual(
    similarGames(pool, twoK, 6, 2).games.map((x) => x.id),
    ["hextris", "kikiew-puzzle"],
  );
  // An own game never treats curated games as its creator's.
  assert.deepEqual(moreFromCreator(pool, pool[4]).map((x) => x.id), []);
});
