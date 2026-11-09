// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

const { attributionText, curationFromRow, isCuratedHandle, licenseLabel, shortUrl, CURATION_LICENSES } = await import(
  "./curation.ts"
);

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
