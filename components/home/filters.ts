import type { BrowseSort } from "@/lib/store";
import type { Game, HistoryItem } from "@/lib/types";

export type HomeView = "all" | "liked" | "recent";

export type HomeFilters = {
  q: string;
  tags: string[];
  creators: string[];
  view: HomeView | null;
  sort: BrowseSort;
};

type Params = { get(name: string): string | null; getAll(name: string): string[] };

function asSort(value: string | null): BrowseSort {
  if (value === "new" || value === "rated") return value;
  return "popular";
}

function asView(value: string | null): HomeView | null {
  if (value === "all" || value === "liked" || value === "recent") return value;
  return null;
}

function unique(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function parseFilters(params: Params): HomeFilters {
  return {
    q: params.get("q") ?? "",
    tags: unique(params.getAll("tag")),
    creators: unique(params.getAll("creator").map((c) => c.toLowerCase())),
    view: asView(params.get("view")),
    sort: asSort(params.get("sort")),
  };
}

/** True when the homepage should show a results grid instead of the curated shelves. */
export function isBrowsing(f: HomeFilters) {
  return Boolean(f.q || f.tags.length || f.creators.length || f.view);
}

export function filtersHref(f: Partial<HomeFilters>) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  for (const tag of f.tags ?? []) sp.append("tag", tag);
  for (const creator of f.creators ?? []) sp.append("creator", creator);
  if (f.view) sp.set("view", f.view);
  if (f.sort && f.sort !== "popular") sp.set("sort", f.sort);
  const s = sp.toString();
  return s ? `/?${s}` : "/";
}

export function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function popularityScore(game: Game) {
  return game.playCount + game.promotionBoost;
}

export function byPopularity(games: Game[]) {
  return [...games].sort((a, b) => popularityScore(b) - popularityScore(a) || b.createdAt.localeCompare(a.createdAt));
}

export function byNewest(games: Game[]) {
  return [...games].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function isNewThisWeek(iso: string) {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at < 7 * 86_400_000;
}

export type Creator = { handle: string; name: string; games: number; plays: number };

/** Creators who have published at least one game, most played first. */
export function creatorsOf(games: Game[]): Creator[] {
  const map = new Map<string, Creator>();
  for (const game of games) {
    const handle = game.channelHandle?.toLowerCase();
    if (!handle) continue;
    const cur = map.get(handle) ?? { handle, name: game.developer || handle, games: 0, plays: 0 };
    cur.games += 1;
    cur.plays += game.playCount;
    map.set(handle, cur);
  }
  return [...map.values()].sort((a, b) => b.plays - a.plays || b.games - a.games || a.name.localeCompare(b.name));
}

/** The first tag shared by enough games to fill a shelf of its own. */
export function shelfTag(tags: string[], games: Game[], min = 3) {
  return tags.find((tag) => games.filter((g) => g.tags.includes(tag)).length >= min) ?? null;
}

export function applyFilters(
  games: Game[],
  f: HomeFilters,
  ctx: { liked: Record<string, true>; history: HistoryItem[] },
) {
  let list = games;
  if (f.view === "liked") list = list.filter((g) => ctx.liked[g.id]);
  if (f.view === "recent") {
    const order = new Map(ctx.history.map((h, i) => [h.id, i]));
    list = list.filter((g) => order.has(g.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  if (f.tags.length) list = list.filter((g) => g.tags.some((t) => f.tags.includes(t)));
  if (f.creators.length) list = list.filter((g) => f.creators.includes(g.channelHandle?.toLowerCase() ?? ""));
  return list;
}

/** Sentence case for tag labels: "slice of life" → "Slice of life". */
export function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Plain-text excerpt for the hero blurb. */
export function excerpt(text: string, max = 160) {
  const plain = text.replace(/[#*_`>[\]()!-]+/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
