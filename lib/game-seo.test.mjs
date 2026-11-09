// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

const seo = await import("./game-seo.ts");

const base = {
  title: "Ayam Kabur",
  tagline: "Catch the runaway chickens before the market closes.",
  description: "A long description.",
  creatorName: "kikiew",
  creatorUrl: "https://playinweb.com/kikiew",
  url: "https://playinweb.com/kikiew/ayam-kabur",
  image: "https://cdn.example.com/cover.webp",
  genre: "Platformer",
  plays: 12_400,
  publishedAt: "2026-11-01T00:00:00.000Z",
};

test("gameTitle names the game and its creator", () => {
  assert.equal(seo.gameTitle("Ayam Kabur", "kikiew"), "Ayam Kabur by kikiew");
  assert.equal(seo.gameTitle("  Ayam   Kabur ", ""), "Ayam Kabur");
  assert.equal(seo.gameTitle("", "kikiew"), "Untitled game by kikiew");
});

test("gameDescription prefers the tagline, then the description, then a fallback", () => {
  assert.equal(seo.gameDescription(base), base.tagline);
  assert.equal(seo.gameDescription({ ...base, tagline: "  " }), "A long description.");
  assert.equal(
    seo.gameDescription({ title: "Ayam Kabur", tagline: null, description: "" }),
    "Play Ayam Kabur free in your browser on PlayInWeb.",
  );
});

test("gameDescription puts text on one line and cuts it at a word", () => {
  const long = `Line one.\n\nLine two ${"word ".repeat(60)}`;
  const out = seo.gameDescription({ title: "X", tagline: "", description: long });
  assert.ok(out.length <= 160, `length ${out.length}`);
  assert.ok(out.endsWith("…"));
  assert.ok(!out.includes("\n"));
  assert.ok(!/\s…$/.test(out), "no space before the ellipsis");
});

test("gameJsonLd describes a VideoGame", () => {
  const data = seo.gameJsonLd(base);
  assert.equal(data["@type"], "VideoGame");
  assert.equal(data.name, "Ayam Kabur");
  assert.equal(data.url, base.url);
  assert.equal(data.genre, "Platformer");
  assert.equal(data.author.name, "kikiew");
  assert.equal(data.interactionStatistic.userInteractionCount, 12_400);
});

test("gameJsonLd leaves out missing image and genre", () => {
  const data = seo.gameJsonLd({ ...base, image: null, genre: null, plays: Number.NaN });
  assert.equal("image" in data, false);
  assert.equal("genre" in data, false);
  assert.equal(data.interactionStatistic.userInteractionCount, 0);
});

test("jsonLdHtml can't be closed by a title containing </script>", () => {
  const html = seo.jsonLdHtml(seo.gameJsonLd({ ...base, title: '</script><script>alert("x")</script>' }));
  assert.equal(html.includes("<"), false);
  assert.ok(html.includes("\\u003c/script>"));
  assert.equal(JSON.parse(html).name, '</script><script>alert("x")</script>');
});

test("withSearch keeps the query when redirecting", () => {
  const url = "https://playinweb.com/kikiew/ayam-kabur";
  assert.equal(seo.withSearch(url, {}), url);
  assert.equal(seo.withSearch(url, { play: "1" }), `${url}?play=1`);
  assert.equal(seo.withSearch(url, { tag: ["a", "b"], skip: undefined }), `${url}?tag=a&tag=b`);
});

test("sitemapPaths lists each creator once and skips rows without a handle or slug", () => {
  const out = seo.sitemapPaths([
    { handle: "kikiew", slug: "ayam-kabur" },
    { handle: "kikiew", slug: "night-bus" },
    { handle: "kikiew", slug: "night-bus" },
    { handle: "dimas", slug: null },
    { handle: null, slug: "orphan" },
  ]);
  assert.deepEqual(out.creators, ["kikiew", "dimas"]);
  assert.deepEqual(out.games, [
    { handle: "kikiew", slug: "ayam-kabur" },
    { handle: "kikiew", slug: "night-bus" },
  ]);
});
