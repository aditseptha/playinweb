// Content formatting rules for the design system. Import from "@/lib/format", which
// re-exports everything here. This file has no imports so the tests can load it directly.
//
// Locale and time zone are fixed so the server and the browser render the same string.

export const LOCALE = "en-US";
export const TIME_ZONE = "UTC";

const full = new Intl.NumberFormat(LOCALE);
const plural = new Intl.PluralRules(LOCALE);

function unit(n: number, size: number, suffix: string) {
  const v = n / size;
  return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}${suffix}`;
}

/**
 * Stats on cards and pages: 950, 1.2K, 12K, 340K, 3.4M, 12M.
 * One decimal below 10 of a unit, none above. Tables and money use full numbers.
 */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a < 1000) return sign + String(Math.round(a));
  // 999,950 would round to "1000K"; step up to millions instead.
  if (a < 999_500) return sign + unit(a, 1000, "K");
  return sign + unit(a, 1_000_000, "M");
}

/** Full number with grouping: 98,765,432. */
export function formatNumber(n: number): string {
  return full.format(Number.isFinite(n) ? n : 0);
}

/** Money, always two decimals: $1,250.00. */
export function formatMoney(n: number, currency = "USD"): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/** File sizes for uploads: 980 KB, 3.4 MB, 100 MB. Binary units (1 MB = 1024 KB), like the OS. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1).replace(/\.0$/, "")} MB`;
  return `${(mb / 1024).toFixed(1).replace(/\.0$/, "")} GB`;
}

/** "play" → "1 play" / "12.4K plays". Pass `pluralWord` for irregular words. */
export function formatCount(n: number, word: string, pluralWord = `${word}s`, { full: useFull = false } = {}) {
  const shown = useFull ? formatNumber(n) : formatCompact(n);
  return `${shown} ${plural.select(n) === "one" ? word : pluralWord}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Dates are assembled by hand rather than with toLocaleString: engines disagree on the details
// (Safari writes "Nov 8, 2026 at 2:25 PM", Node "Nov 8, 2026, 2:25 PM"), which breaks hydration.

/** Full date: Nov 8, 2026. */
export function formatDate(value: string | number | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Date and time: Nov 8, 2026, 2:25 PM UTC. */
export function formatDateTime(value: string | number | Date): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(d)}, ${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"} UTC`;
}

/**
 * Relative under 7 days ("just now", "5 min ago", "3 hours ago", "2 days ago"), full date after.
 * Show formatDate/formatDateTime in a tooltip or `title` next to it.
 */
export function formatRelative(value: string | number | Date, now: number = Date.now()): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const seconds = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatDate(d);
}
