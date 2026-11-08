// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

const f = await import("./format-core.ts");

test("formatCompact keeps one decimal below 10 of a unit", () => {
  assert.equal(f.formatCompact(0), "0");
  assert.equal(f.formatCompact(950), "950");
  assert.equal(f.formatCompact(1000), "1K");
  assert.equal(f.formatCompact(1250), "1.3K");
  assert.equal(f.formatCompact(12_400), "12K");
  assert.equal(f.formatCompact(340_000), "340K");
  assert.equal(f.formatCompact(999_950), "1M");
  assert.equal(f.formatCompact(3_400_000), "3.4M");
  assert.equal(f.formatCompact(98_765_432), "99M");
  assert.equal(f.formatCompact(-1500), "-1.5K");
  assert.equal(f.formatCompact(Number.NaN), "0");
});

test("formatNumber and formatMoney use full numbers", () => {
  assert.equal(f.formatNumber(98_765_432), "98,765,432");
  assert.equal(f.formatMoney(1250), "$1,250.00");
  assert.equal(f.formatMoney(0.5), "$0.50");
});

test("formatCount picks singular or plural", () => {
  assert.equal(f.formatCount(1, "play"), "1 play");
  assert.equal(f.formatCount(12_400, "play"), "12K plays");
  assert.equal(f.formatCount(2, "story", "stories"), "2 stories");
  assert.equal(f.formatCount(1234, "like", undefined, { full: true }), "1,234 likes");
});

test("formatRelative switches to a full date after a week", () => {
  const now = Date.UTC(2026, 10, 8, 12, 0, 0);
  assert.equal(f.formatRelative(now - 20_000, now), "just now");
  assert.equal(f.formatRelative(now - 5 * 60_000, now), "5 min ago");
  assert.equal(f.formatRelative(now - 3_600_000, now), "1 hour ago");
  assert.equal(f.formatRelative(now - 3 * 3_600_000, now), "3 hours ago");
  assert.equal(f.formatRelative(now - 2 * 86_400_000, now), "2 days ago");
  assert.equal(f.formatRelative(now - 8 * 86_400_000, now), "Oct 31, 2026");
  assert.equal(f.formatRelative("not a date", now), "");
});

test("formatDate is fixed to UTC", () => {
  assert.equal(f.formatDate("2026-11-08T23:30:00Z"), "Nov 8, 2026");
  assert.equal(f.formatDateTime("2026-11-08T14:25:00Z"), "Nov 8, 2026, 2:25 PM UTC");
});
