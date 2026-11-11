// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

const {
  attributionText,
  curationFromRow,
  embedFrameSize,
  isCuratedHandle,
  isOfficialEmbedUrl,
  licenseLabel,
  playFrameSize,
  shortUrl,
  validFrameSize,
  CURATION_LICENSES,
} = await import("./curation.ts");

const row = {
  status: "listed",
  play_mode: "hosted",
  creator_name: "Gabriele Cirulli",
  creator_url: "https://github.com/gabrielecirulli",
  source_url: "https://play2048.co",
  source_code_url: "https://github.com/gabrielecirulli/2048/",
  license: "MIT",
  license_url: null,
  modified: false,
};

test("curationFromRow reads an embedded row, as an object or a one-item array", () => {
  const c = curationFromRow(row);
  assert.equal(c.creatorName, "Gabriele Cirulli");
  assert.equal(c.playMode, "hosted");
  assert.equal(c.licenseUrl, undefined);
  assert.deepEqual(curationFromRow([row]), c);
});

test("curationFromRow ignores claimed games, missing rows, and rows without credit", () => {
  assert.equal(curationFromRow({ ...row, status: "claimed" }), null);
  assert.equal(curationFromRow(null), null);
  assert.equal(curationFromRow([]), null);
  assert.equal(curationFromRow({ ...row, creator_name: "" }), null);
  assert.equal(curationFromRow({ ...row, license: "" }), null);
});

test("curationFromRow drops links that are not http(s)", () => {
  const c = curationFromRow({ ...row, creator_url: "javascript:alert(1)", source_url: "ftp://x" });
  assert.equal(c.creatorUrl, undefined);
  assert.equal(c.sourceUrl, undefined);
});

test("unknown play modes fall back to hosted", () => {
  assert.equal(curationFromRow({ ...row, play_mode: "weird" }).playMode, "hosted");
  assert.equal(curationFromRow({ ...row, play_mode: "link_out" }).playMode, "link_out");
  assert.equal(curationFromRow({ ...row, play_mode: "embed" }).playMode, "embed");
});

test("isOfficialEmbedUrl accepts only known embed players over https", () => {
  assert.equal(isOfficialEmbedUrl("https://itch.io/embed-upload/12786123?color=000000"), true);
  assert.equal(isOfficialEmbedUrl("https://www.lexaloffle.com/bbs/widget.php?pid=11722"), true);
  assert.equal(isOfficialEmbedUrl("http://itch.io/embed-upload/12786123"), false);
  assert.equal(isOfficialEmbedUrl("https://danielben.itch.io/dragonsweeper"), false);
  assert.equal(isOfficialEmbedUrl("https://html-classic.itch.zone/html/12786123/index.html"), false);
  assert.equal(isOfficialEmbedUrl("https://evil.example/embed-upload/1"), false);
  assert.equal(isOfficialEmbedUrl("https://itch.io.evil.example/embed-upload/1"), false);
  assert.equal(isOfficialEmbedUrl("not a url"), false);
  assert.equal(isOfficialEmbedUrl(null), false);
});

test("embedFrameSize gives the PICO-8 player its fixed box and lets other players fill the stage", () => {
  assert.deepEqual(embedFrameSize("https://www.lexaloffle.com/bbs/widget.php?pid=molemole"), { width: 621, height: 513 });
  assert.equal(embedFrameSize("https://itch.io/embed-upload/12786123?color=000000"), null);
  assert.equal(embedFrameSize("/alice/game/index.html"), null);
});

test("validFrameSize accepts whole pixel sizes in range and rejects the rest", () => {
  assert.deepEqual(validFrameSize(1280, 720), { width: 1280, height: 720 });
  assert.deepEqual(validFrameSize("960", "540"), { width: 960, height: 540 });
  assert.equal(validFrameSize(null, 720), undefined);
  assert.equal(validFrameSize(1280, ""), undefined);
  assert.equal(validFrameSize(150, 720), undefined);
  assert.equal(validFrameSize(1280.5, 720), undefined);
  assert.equal(validFrameSize(5000, 720), undefined);
});

test("curationFromRow reads the game's native frame size", () => {
  assert.deepEqual(curationFromRow({ ...row, play_mode: "embed", frame_width: 1280, frame_height: 720 }).frameSize, { width: 1280, height: 720 });
  assert.equal(curationFromRow(row).frameSize, undefined);
});

test("playFrameSize prefers the per-game size over the embed player's default", () => {
  const itch = "https://itch.io/embed-upload/12786123?color=000000";
  assert.deepEqual(playFrameSize({ frameSize: { width: 960, height: 540 } }, itch), { width: 960, height: 540 });
  assert.equal(playFrameSize(null, itch), null);
  assert.deepEqual(playFrameSize(undefined, "https://www.lexaloffle.com/bbs/widget.php?pid=molemole"), { width: 621, height: 513 });
});

test("attributionText builds one credit line", () => {
  assert.equal(
    attributionText(curationFromRow(row)),
    "Made by Gabriele Cirulli · MIT License · Source: github.com/gabrielecirulli/2048",
  );
  assert.equal(
    attributionText(curationFromRow({ ...row, license: "GPL-3.0", modified: true, source_code_url: null })),
    "Made by Gabriele Cirulli · GNU GPL v3 · Modified for PlayInWeb",
  );
});

test("shortUrl strips the scheme, www and trailing slashes", () => {
  assert.equal(shortUrl("https://www.example.com/a/b/"), "example.com/a/b");
  assert.equal(shortUrl("http://play2048.co"), "play2048.co");
});

test("license list has labels and no non-commercial or no-derivatives licenses", () => {
  for (const id of CURATION_LICENSES) assert.notEqual(licenseLabel(id), "", id);
  assert.ok(CURATION_LICENSES.every((id) => !/-NC|-ND/.test(id)));
  assert.equal(licenseLabel("Something-Else"), "Something-Else");
});

test("isCuratedHandle matches the system handle only", () => {
  assert.equal(isCuratedHandle("listed"), true);
  assert.equal(isCuratedHandle("Listed"), true);
  assert.equal(isCuratedHandle("kikiew"), false);
  assert.equal(isCuratedHandle(undefined), false);
});
