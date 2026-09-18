import { projectPublicUrl, siteOrigin } from "@/lib/host";

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format(n);
}

export function formatPlays(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  const m = n / 1_000_000;
  return `${m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")}M`;
}

export function formatScore(n: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(n);
}

export function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function slugify(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "channel";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function channelPath(developer: string, handle?: string) {
  if (handle) return siteOrigin(handle);
  return `/channel/${slugify(developer)}`;
}

export function gamePath(game: { id: string; channelHandle?: string; projectSlug?: string }) {
  if (game.channelHandle && game.projectSlug) return projectPublicUrl(game.channelHandle, game.projectSlug);
  return `/game/${game.id}`;
}

export function formatJoined(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export function formatCommentTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAgeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hours = Math.max(0, Math.floor((Date.now() - d.getTime()) / 3_600_000));
  if (hours < 1) return "JUST NOW";
  if (hours < 24) return `${hours} ${hours === 1 ? "HOUR" : "HOURS"} AGO`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} ${days === 1 ? "DAY" : "DAYS"} AGO`;
  return formatJoined(iso).toUpperCase();
}
