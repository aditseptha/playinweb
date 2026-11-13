import { matchesDevice, parseDevice, type Device } from "@/lib/device";
import type { Game, HistoryItem } from "@/lib/types";

/** Results views: personal lists, or the "See all" of a homepage row. */
export type HomeView = "saved" | "recent" | "featured" | "new" | "popular" | "hot";

export type HomeFilters = {
  q: string;
  tags: string[];
  creators: string[];
  view: HomeView | null;
  /** Full grid for `view=recent` (See all). The rail checkbox uses `view=recent` without browse. */
  browse: boolean;
  /** Phone or Desktop chip (#38). Filters every row; it does not switch to the results grid. */
  device: Device | null;
};

type Params = { get(name: string): string | null; getAll(name: string): string[] };

const VIEWS: HomeView[] = ["saved", "recent", "featured", "new", "popular", "hot"];

export const VIEW_TITLES: Record<HomeView, string> = {
  saved: "Favorites",
  recent: "Recently played",
  featured: "Featured games",
  new: "Newest games",
  popular: "Most played",
  hot: "Hottest this week",
};

function unique(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function parseFilters(params: Params): HomeFilters {
  const view = params.get("view");
  return {
    q: params.get("q") ?? "",
    tags: unique(params.getAll("tag")),
    creators: unique(params.getAll("creator").map((c) => c.toLowerCase())),
    view: VIEWS.includes(view as HomeView) ? (view as HomeView) : null,
    browse: params.get("browse") === "1",
    device: parseDevice(params.get("device")),
  };
}

/** True when the homepage should show a results grid instead of the curated rows. */
export function isBrowsing(f: HomeFilters) {
  if (f.q.trim() || f.tags.length || f.creators.length) return true;
  if (!f.view) return false;
  if (f.view === "recent") return f.browse;
  return true;
}

export function filtersHref(f: Partial<HomeFilters>) {
  const sp = new URLSearchParams();
  if (f.q?.trim()) sp.set("q", f.q.trim());
  for (const tag of f.tags ?? []) sp.append("tag", tag);
  for (const creator of f.creators ?? []) sp.append("creator", creator);
  if (f.view) sp.set("view", f.view);
  if (f.browse) sp.set("browse", "1");
  if (f.device) sp.set("device", f.device);
  const s = sp.toString();
  return s ? `/?${s}` : "/";
}

export function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function popularityScore(game: Game) {
  return game.playCount + game.promotionBoost;
}

export function byPopularity(games: Game[]) {
  return [...games].sort((a, b) => popularityScore(b) - popularityScore(a) || b.createdAt.localeCompare(a.createdAt));
}

export function byNewest(games: Game[]) {
  return [...games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Plays in the last 7 days when `weekly` is populated; otherwise falls back to all-time popularity. */
export function byHotThisWeek(games: Game[], weekly: Record<string, number>) {
  const hasWeekly = Object.keys(weekly).length > 0;
  return [...games].sort((a, b) => {
    if (hasWeekly) {
      const d = (weekly[b.id] ?? 0) - (weekly[a.id] ?? 0);
      if (d !== 0) return d;
    }
    return popularityScore(b) - popularityScore(a) || b.createdAt.localeCompare(a.createdAt);
  });
}

export function isNewThisWeek(iso: string) {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at < 7 * 86_400_000;
}

export type Creator = { handle: string; name: string; games: number; plays: number; avatarUrl?: string };

/** Creators who have published at least one game, most played first. */
export function creatorsOf(games: Game[]): Creator[] {
  const map = new Map<string, Creator>();
  for (const game of games) {
    const handle = game.channelHandle?.toLowerCase();
    // Curated games all belong to the `listed` system account, which is not a creator.
    if (!handle || game.curated) continue;
    const cur = map.get(handle) ?? { handle, name: game.developer || handle, games: 0, plays: 0 };
    cur.games += 1;
    cur.plays += game.playCount;
    if (!cur.avatarUrl && game.creatorAvatarUrl) cur.avatarUrl = game.creatorAvatarUrl;
    map.set(handle, cur);
  }
  return [...map.values()].sort((a, b) => b.plays - a.plays || b.games - a.games || a.name.localeCompare(b.name));
}

/** The first tag shared by enough games to fill a row of its own. */
export function shelfTag(tags: string[], games: Game[], min = 3) {
  return tags.find((tag) => games.filter((g) => g.tags.includes(tag)).length >= min) ?? null;
}

/** Games for a results view, before the panel filters apply. */
export function viewGames(
  view: HomeView | null,
  games: Game[],
  ctx: { library: string[]; history: HistoryItem[]; weeklyPlays?: Record<string, number> },
) {
  switch (view) {
    case "saved":
      return games.filter((g) => ctx.library.includes(g.id));
    case "recent": {
      const order = new Map(ctx.history.map((h, i) => [h.id, i]));
      return games.filter((g) => order.has(g.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }
    case "new":
      return byNewest(games);
    case "hot":
      return byHotThisWeek(games, ctx.weeklyPlays ?? {});
    case "featured":
    case "popular":
    case null:
      return byPopularity(games);
  }
}

export function matchesFilters(game: Game, f: HomeFilters) {
  if (!matchesDevice(game.controls, f.device)) return false;
  if (f.tags.length && !game.tags.some((t) => f.tags.includes(t))) return false;
  if (f.creators.length && !f.creators.includes(game.channelHandle?.toLowerCase() ?? "")) return false;
  const q = f.q.trim().toLowerCase();
  if (q) {
    // A curated game's handle is the system account, not its creator, so it is not searchable.
    const handle = game.curated ? "" : (game.channelHandle ?? "");
    const hay = [game.title, game.developer, handle, ...game.tags].join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Sentence case for tag labels: "slice of life" → "Slice of life". */
export function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Plain-text excerpt for blurbs. */
export function excerpt(text: string, max = 160) {
  const plain = text.replace(/[#*_`>[\]()!-]+/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "2 hours ago", "yesterday". */
export function timeAgo(at: number) {
  const s = Math.round((at - Date.now()) / 1000);
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
  ];
  let value = s;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return RELATIVE.format(Math.round(value), unit);
    value /= size;
  }
  return RELATIVE.format(Math.round(value), "year");
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

/** Initials-disc colours from the prototype, assigned by position. */
export const CREATOR_COLORS = ["#f6c8a6", "#9eb8ff", "#ffb43a", "#c9adff", "#8ee3b4", "#ff8f9e"];
