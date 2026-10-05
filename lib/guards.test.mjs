// Run with `npm test` (node's built-in runner; Node strips the .ts types on import).
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.NEXT_PUBLIC_ROOT_DOMAIN = "playinweb.com";
const { safeReturnTo } = await import("./host.ts");
const { parseCheckoutInput, withCheckoutPlaceholder, clampCommission } = await import("./polar.ts");

test("safeReturnTo keeps same-site destinations", () => {
  assert.equal(safeReturnTo("/profile?edit=1"), "https://playinweb.com/profile?edit=1");
  assert.equal(safeReturnTo("https://alice.playinweb.com/game"), "https://alice.playinweb.com/game");
  assert.equal(safeReturnTo(null), "/");
});

test("safeReturnTo blocks off-site redirects", () => {
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "https://playinweb.com.evil.com", "javascript:alert(1)"]) {
    assert.equal(safeReturnTo(bad), "/", bad);
  }
});

const ok = { kind: "tip", amount: 5, successUrl: "https://playinweb.com/tip" };

test("checkout input enforces amount limits", () => {
  assert.ok("error" in parseCheckoutInput({ ...ok, amount: 0.5 }));
  assert.ok("error" in parseCheckoutInput({ ...ok, amount: 101 }));
  assert.ok("error" in parseCheckoutInput({ ...ok, amount: "abc" }));
  assert.ok("error" in parseCheckoutInput(null));
  assert.equal(parseCheckoutInput({ ...ok, amount: "100" }).amount, 100);
});

test("checkout input rejects non-http return URLs and normalizes kind", () => {
  assert.ok("error" in parseCheckoutInput({ ...ok, successUrl: "javascript:alert(1)" }));
  assert.ok("error" in parseCheckoutInput({ ...ok, returnUrl: "ftp://x" }));
  const input = parseCheckoutInput({ ...ok, kind: "bogus", range: "year" });
  assert.equal(input.kind, "donation");
  assert.equal(input.range, "all");
  assert.equal(input.returnUrl, ok.successUrl);
});

test("checkout success URL gets a fresh placeholder", () => {
  assert.equal(
    withCheckoutPlaceholder("https://playinweb.com/tip?checkout_id=old&x=1#top"),
    "https://playinweb.com/tip?x=1&checkout_id={CHECKOUT_ID}#top",
  );
});

test("commission is clamped to 0-100", () => {
  assert.equal(clampCommission(150), 100);
  assert.equal(clampCommission(-5), 0);
  assert.equal(clampCommission(NaN), 10);
});
