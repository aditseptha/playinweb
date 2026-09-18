"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { SEED_GAMES } from "@/data/games";
import { slugify } from "@/lib/format";
import { fetchCatalogueGames, readCatalogueCache } from "@/lib/projects";
import type { Collection, Game, HistoryItem, Profile } from "@/lib/types";

const STORAGE_KEY = "showcase.v1";
const PLAY_DEBOUNCE_MS = 30_000;
const HISTORY_MAX = 24;

type Persist = {
  registered: Game[];
  plays: Record<string, number>;
  playAt: Record<string, number>;
  likeCounts: Record<string, number>;
  liked: Record<string, true>;
  library: string[];
  collections: Collection[];
  profile: Profile | null;
  history: HistoryItem[];
};

type RegisterInput = {
  title: string;
  developer: string;
  description: string;
  playUrl: string;
  thumbnailUrl: string;
  screenshots: string[];
  embeddable: boolean;
  tags: string[];
};

export type Snapshot = {
  games: Game[];
  profile: Profile | null;
  history: HistoryItem[];
  myGameIds: string[];
  liked: Record<string, true>;
  library: string[];
  collections: Collection[];
};

type GamesContextValue = Snapshot & {
  recordPlay: (id: string) => void;
  registerGame: (input: RegisterInput) => Game;
  saveProfile: (profile: Profile) => void;
  toggleLike: (id: string) => void;
  toggleLibrary: (id: string) => void;
  removeFromHistory: (id: string) => void;
  createCollection: (name: string, gameId?: string) => Collection | null;
  addToCollection: (collectionId: string, gameId: string) => void;
  removeFromCollection: (collectionId: string, gameId: string) => void;
};

const GamesContext = createContext<GamesContextValue | null>(null);
const listeners = new Set<() => void>();

const serverSnapshot: Snapshot = {
  games: SEED_GAMES,
  profile: null,
  history: [],
  myGameIds: [],
  liked: {},
  library: [],
  collections: [],
};

let cachedRaw: string | null | undefined;
let cachedSnap: Snapshot = serverSnapshot;

function emit() {
  cachedRaw = undefined;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emptyPersist(): Persist {
  return {
    registered: [],
    plays: {},
    playAt: {},
    likeCounts: {},
    liked: {},
    library: [],
    collections: [],
    profile: null,
    history: [],
  };
}

function parseProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<Profile>;
  const name = typeof p.name === "string" ? p.name.trim() : "";
  const handle = typeof p.handle === "string" ? slugify(p.handle) : "";
  if (!name || !handle) return null;
  return {
    name,
    handle,
    bio: typeof p.bio === "string" ? p.bio.trim() : "",
  };
}

function parseHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is HistoryItem => {
      return !!item && typeof item.id === "string" && typeof item.at === "number";
    })
    .slice(0, HISTORY_MAX);
}

function parseStringRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function parseLiked(value: unknown): Record<string, true> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, true> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v) out[k] = true;
  }
  return out;
}

function parseIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))];
}

function parseCollections(value: unknown): Collection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const c = item as Partial<Collection>;
      if (typeof c.id !== "string" || typeof c.name !== "string") return null;
      return {
        id: c.id,
        name: c.name.trim() || "Untitled",
        gameIds: parseIdList(c.gameIds),
        createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
      };
    })
    .filter((c): c is Collection => c != null);
}

function parseRegistered(value: unknown): Game[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const g = item as Partial<Game>;
    if (typeof g.id !== "string" || typeof g.title !== "string") return [];
    return [
      {
        id: g.id,
        title: g.title,
        developer: typeof g.developer === "string" ? g.developer : "Unknown",
        description: typeof g.description === "string" ? g.description : "",
        playUrl: typeof g.playUrl === "string" ? g.playUrl : "/",
        thumbnailUrl: typeof g.thumbnailUrl === "string" ? g.thumbnailUrl : "",
        screenshots: Array.isArray(g.screenshots)
          ? g.screenshots.filter((s): s is string => typeof s === "string" && s.length > 0)
          : [],
        embeddable: !!g.embeddable,
        tags: Array.isArray(g.tags) ? g.tags.filter((t): t is string => typeof t === "string") : [],
        createdAt: typeof g.createdAt === "string" ? g.createdAt : new Date().toISOString(),
        playCount: typeof g.playCount === "number" && Number.isFinite(g.playCount) ? g.playCount : 0,
        viewCount: typeof g.viewCount === "number" && Number.isFinite(g.viewCount) ? g.viewCount : 0,
        likeCount: typeof g.likeCount === "number" && Number.isFinite(g.likeCount) ? g.likeCount : 0,
        promotionBoost:
          typeof g.promotionBoost === "number" && Number.isFinite(g.promotionBoost) ? g.promotionBoost : 0,
      } satisfies Game,
    ];
  });
}

function parsePersist(raw: string | null): Persist {
  if (!raw) return emptyPersist();
  try {
    const parsed = JSON.parse(raw) as Partial<Persist>;
    return {
      registered: parseRegistered(parsed.registered),
      plays: parseStringRecord(parsed.plays),
      playAt: parseStringRecord(parsed.playAt),
      likeCounts: parseStringRecord(parsed.likeCounts),
      liked: parseLiked(parsed.liked),
      library: parseIdList(parsed.library),
      collections: parseCollections(parsed.collections),
      profile: parseProfile(parsed.profile),
      history: parseHistory(parsed.history),
    };
  } catch {
    return emptyPersist();
  }
}

function readPersist(): Persist {
  return parsePersist(localStorage.getItem(STORAGE_KEY));
}

function writePersist(data: Persist) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  emit();
}

function normalizeGame(game: Game, persist: Persist): Game {
  return {
    ...game,
    screenshots: Array.isArray(game.screenshots) ? game.screenshots.filter(Boolean) : [],
    likeCount: persist.likeCounts[game.id] ?? game.likeCount ?? 0,
    playCount: persist.plays[game.id] ?? game.playCount,
    viewCount: game.viewCount ?? 0,
    promotionBoost: game.promotionBoost ?? 0,
  };
}

function mergeGames(persist: Persist): Game[] {
  const seedIds = new Set(SEED_GAMES.map((g) => g.id));
  const extras = persist.registered.filter((g) => g && g.id && !seedIds.has(g.id));
  return [...SEED_GAMES.map((g) => normalizeGame(g, persist)), ...extras.map((g) => normalizeGame(g, persist))];
}

function toSnapshot(persist: Persist): Snapshot {
  return {
    games: mergeGames(persist),
    profile: persist.profile,
    history: persist.history,
    myGameIds: persist.registered.map((g) => g.id).filter(Boolean),
    liked: persist.liked,
    library: persist.library,
    collections: persist.collections,
  };
}

function getSnapshot(): Snapshot {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnap;
  cachedRaw = raw;
  cachedSnap = toSnapshot(parsePersist(raw));
  return cachedSnap;
}

function getServerSnapshot(): Snapshot {
  return serverSnapshot;
}

function slugId(title: string): string {
  const slug = slugify(title).slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 7);
  return `u-${slug || "game"}-${rand}`;
}

export function GamesProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [remote, setRemote] = useState<Game[]>([]);

  useEffect(() => {
    let cancelled = false;
    const cached = readCatalogueCache();
    if (cached?.games.length) setRemote(cached.games);
    if (cached?.fresh) return;
    fetchCatalogueGames({ force: true })
      .then((games) => {
        if (!cancelled) setRemote(games);
      })
      .catch(() => {
        if (!cancelled && !cached?.games.length) setRemote([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recordPlay = useCallback((id: string) => {
    const persist = readPersist();
    persist.history = [{ id, at: Date.now() }, ...persist.history.filter((h) => h.id !== id)].slice(
      0,
      HISTORY_MAX,
    );
    const last = persist.playAt[id] ?? 0;
    if (Date.now() - last >= PLAY_DEBOUNCE_MS) {
      persist.playAt[id] = Date.now();
      const current = mergeGames(persist);
      const target = current.find((g) => g.id === id);
      if (target) persist.plays[id] = target.playCount + 1;
    }
    writePersist(persist);
  }, []);

  const registerGame = useCallback((input: RegisterInput): Game => {
    const game: Game = {
      id: slugId(input.title),
      title: input.title.trim(),
      developer: input.developer.trim(),
      description: input.description.trim(),
      playUrl: input.playUrl.trim(),
      thumbnailUrl: input.thumbnailUrl.trim(),
      screenshots: input.screenshots,
      embeddable: input.embeddable,
      tags: input.tags,
      createdAt: new Date().toISOString(),
      playCount: 0,
      viewCount: 0,
      likeCount: 0,
      promotionBoost: 0,
    };
    const persist = readPersist();
    persist.registered = [...persist.registered, game];
    writePersist(persist);
    return game;
  }, []);

  const saveProfile = useCallback((profile: Profile) => {
    const persist = readPersist();
    persist.profile = {
      name: profile.name.trim(),
      handle: slugify(profile.handle || profile.name),
      bio: profile.bio.trim(),
    };
    writePersist(persist);
  }, []);

  const toggleLike = useCallback((id: string) => {
    const persist = readPersist();
    const current = mergeGames(persist).find((g) => g.id === id);
    if (persist.liked[id]) {
      delete persist.liked[id];
      if (current) persist.likeCounts[id] = Math.max(0, current.likeCount - 1);
    } else {
      persist.liked[id] = true;
      if (current) persist.likeCounts[id] = current.likeCount + 1;
    }
    writePersist(persist);
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    const persist = readPersist();
    persist.history = persist.history.filter((h) => h.id !== id);
    writePersist(persist);
  }, []);

  const toggleLibrary = useCallback((id: string) => {
    const persist = readPersist();
    persist.library = persist.library.includes(id)
      ? persist.library.filter((x) => x !== id)
      : [...persist.library, id];
    writePersist(persist);
  }, []);

  const createCollection = useCallback((name: string, gameId?: string): Collection | null => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const collection: Collection = {
      id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed.slice(0, 60),
      gameIds: gameId ? [gameId] : [],
      createdAt: new Date().toISOString(),
    };
    const persist = readPersist();
    persist.collections = [...persist.collections, collection];
    writePersist(persist);
    return collection;
  }, []);

  const addToCollection = useCallback((collectionId: string, gameId: string) => {
    const persist = readPersist();
    persist.collections = persist.collections.map((c) => {
      if (c.id !== collectionId || c.gameIds.includes(gameId)) return c;
      return { ...c, gameIds: [...c.gameIds, gameId] };
    });
    writePersist(persist);
  }, []);

  const removeFromCollection = useCallback((collectionId: string, gameId: string) => {
    const persist = readPersist();
    persist.collections = persist.collections.map((c) => {
      if (c.id !== collectionId) return c;
      return { ...c, gameIds: c.gameIds.filter((x) => x !== gameId) };
    });
    writePersist(persist);
  }, []);

  const value = useMemo(
    () => {
      const seen = new Set(snap.games.map((g) => g.id));
      const games = [...snap.games, ...remote.filter((g) => !seen.has(g.id))];
      return {
        ...snap,
        games,
        recordPlay,
        registerGame,
        saveProfile,
        toggleLike,
        toggleLibrary,
        removeFromHistory,
        createCollection,
        addToCollection,
        removeFromCollection,
      };
    },
    [
      snap,
      remote,
      recordPlay,
      registerGame,
      saveProfile,
      toggleLike,
      toggleLibrary,
      removeFromHistory,
      createCollection,
      addToCollection,
      removeFromCollection,
    ],
  );

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
}

export function useGames() {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error("useGames must be used inside GamesProvider");
  return ctx;
}

export function relatedGames(games: Game[], current: Game, limit = 8): Game[] {
  const scored = games
    .filter((g) => g.id !== current.id)
    .map((g) => {
      const overlap = g.tags.filter((t) => current.tags.includes(t)).length;
      return { g, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap || b.g.playCount - a.g.playCount);
  return scored.slice(0, limit).map((s) => s.g);
}

export function normalizeSearchQuery(query: string) {
  return query.trim().replace(/^@+/, "").toLowerCase();
}

export function filterGames(games: Game[], query: string): Game[] {
  const q = normalizeSearchQuery(query);
  if (!q) return games;
  return games.filter((g) => {
    return (
      g.title.toLowerCase().includes(q) ||
      g.developer.toLowerCase().includes(q) ||
      g.channelHandle?.toLowerCase().includes(q) ||
      g.projectSlug?.toLowerCase().includes(q) ||
      g.tags.some((t) => t.toLowerCase().includes(q)) ||
      g.description.toLowerCase().includes(q)
    );
  });
}

export function creatorsFromGames(games: Game[], query: string) {
  const q = normalizeSearchQuery(query);
  if (!q) return [];
  const map = new Map<string, { handle: string; name: string }>();
  for (const game of games) {
    const handle = game.channelHandle?.toLowerCase();
    if (!handle) continue;
    if (!handle.includes(q) && !game.developer.toLowerCase().includes(q)) continue;
    if (!map.has(handle)) map.set(handle, { handle, name: game.developer });
  }
  return [...map.values()];
}

export function gamesForChannel(
  games: Game[],
  slug: string,
  opts?: { myGameIds?: string[]; profileHandle?: string },
): Game[] {
  const byHandle = games.filter((g) => g.channelHandle === slug);
  const byDev = games.filter((g) => slugify(g.developer) === slug);
  const merged = [...byHandle];
  const seen = new Set(merged.map((g) => g.id));
  for (const g of byDev) {
    if (!seen.has(g.id)) {
      merged.push(g);
      seen.add(g.id);
    }
  }
  if (!opts?.profileHandle || opts.profileHandle !== slug) return merged;
  const mine = games.filter((g) => opts.myGameIds?.includes(g.id));
  return [...merged, ...mine.filter((g) => !seen.has(g.id))];
}

export function historyGames(games: Game[], history: HistoryItem[]): Game[] {
  const byId = new Map(games.map((g) => [g.id, g]));
  return history.map((h) => byId.get(h.id)).filter((g): g is Game => !!g);
}

export function gamesByIds(games: Game[], ids: string[]): Game[] {
  const byId = new Map(games.map((g) => [g.id, g]));
  return ids.map((id) => byId.get(id)).filter((g): g is Game => !!g);
}

export function catalogueTags(games: Game[]): string[] {
  const counts = new Map<string, number>();
  for (const game of games) {
    for (const tag of game.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
}

export type BrowseSort = "popular" | "new" | "rated";

export function sortGames(games: Game[], sort: BrowseSort): Game[] {
  const copy = [...games];
  if (sort === "new") return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === "rated") return copy.sort((a, b) => b.likeCount - a.likeCount || b.playCount - a.playCount);
  return copy.sort((a, b) => b.playCount + b.promotionBoost - (a.playCount + a.promotionBoost));
}

export function homeRailGames(games: Game[], limit = 10, newestCount = 3): Game[] {
  const newest = [...games].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, newestCount);
  const taken = new Set(newest.map((g) => g.id));
  const popular = [...games]
    .filter((g) => !taken.has(g.id))
    .sort(
      (a, b) =>
        b.playCount + b.promotionBoost - (a.playCount + a.promotionBoost) ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, Math.max(0, limit - newest.length));
  return [...newest, ...popular];
}

export function homeMoreGames(games: Game[], exclude: Game[], limit = 10): Game[] {
  const taken = new Set(exclude.map((g) => g.id));
  return [...games]
    .filter((g) => !taken.has(g.id))
    .sort((a, b) => b.likeCount - a.likeCount || b.playCount - a.playCount)
    .slice(0, limit);
}
