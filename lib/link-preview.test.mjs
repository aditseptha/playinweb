import assert from "node:assert/strict";
import { test } from "node:test";

const { isPublicAddress, parseLinkPreview, safePreviewUrl, taglineFrom, imageKind } = await import("./link-preview.ts");

test("safePreviewUrl allows public http(s) pages", () => {
  assert.equal(safePreviewUrl("https://example.com/game")?.href, "https://example.com/game");
  assert.equal(safePreviewUrl("  http://example.com/play  ")?.hostname, "example.com");
});

test("safePreviewUrl blocks local and private targets", () => {
  for (const bad of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "http://localhost/game",
    "http://app.local/game",
    "http://127.0.0.1/",
    "http://10.1.2.3/",
    "http://192.168.0.5/",
    "http://169.254.169.254/",
    "http://[::1]/",
    "http://user:pass@example.com/",
    "https://example.com:8443/game",
    "http://2130706433/",
  ]) {
    assert.equal(safePreviewUrl(bad), null, bad);
  }
});

test("isPublicAddress rejects loopback and link-local", () => {
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("127.0.0.1"), false);
  assert.equal(isPublicAddress("::1"), false);
  assert.equal(isPublicAddress("::ffff:127.0.0.1"), false);
  assert.equal(isPublicAddress("2001:4860:4860::8888"), true);
});

test("parseLinkPreview reads Open Graph fields", () => {
  const html = `
    <html><head>
      <title>Ignored</title>
      <meta property="og:title" content="Neon Drift &amp; Co" />
      <meta name="description" content="Short fallback." />
      <meta property="og:description" content="A night race through the city." />
      <meta property="og:image" content="/cover.jpg" />
    </head></html>`;
  const parsed = parseLinkPreview(html, "https://games.example/play");
  assert.equal(parsed.title, "Neon Drift & Co");
  assert.equal(parsed.description, "A night race through the city.");
  assert.equal(parsed.imageUrl, "https://games.example/cover.jpg");
  assert.equal(taglineFrom(parsed.description), "A night race through the city.");
});

test("imageKind recognizes jpeg, png, and webp", () => {
  assert.equal(imageKind(Uint8Array.of(0xff, 0xd8, 0xff, 0x00)), "image/jpeg");
  assert.equal(imageKind(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
  assert.equal(imageKind(Uint8Array.of(0x3c, 0x73, 0x76, 0x67)), null);
});
