// Lists published covers that are under 1280×720 or far from 16:9.
// Usage: node --env-file=.env.local scripts/audit-covers.mjs

import { coverAudit, readImageSize } from "../lib/media-standard.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then run again.");
  process.exit(1);
}

const response = await fetch(
  `${url}/rest/v1/projects?select=id,title,slug,cover_path&published=eq.true&cover_path=not.is.null`,
  { headers: { apikey: key, authorization: `Bearer ${key}` } },
);
if (!response.ok) {
  console.error(`Could not list projects (${response.status}).`);
  process.exit(1);
}

const rows = await response.json();
const flagged = [];
for (const row of rows) {
  if (!row.cover_path || String(row.cover_path).startsWith("http")) continue;
  const imageUrl = `${url}/storage/v1/object/public/project-media/${row.cover_path}`;
  const image = await fetch(imageUrl);
  if (!image.ok) {
    flagged.push({ title: row.title, slug: row.slug, reasons: [`download failed (${image.status})`] });
    continue;
  }
  const size = readImageSize(new Uint8Array(await image.arrayBuffer()));
  if (!size) {
    flagged.push({ title: row.title, slug: row.slug, reasons: ["unreadable image"] });
    continue;
  }
  const reasons = coverAudit(size.width, size.height);
  if (reasons.length) flagged.push({ title: row.title, slug: row.slug, size: `${size.width}×${size.height}`, reasons });
}

console.log(JSON.stringify({ checked: rows.length, flagged }, null, 2));
