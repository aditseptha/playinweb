import { slugify } from "@/lib/format";
import { projectEmbedUrl } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import type { Game } from "@/lib/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type ProjectRecord = Project & {
  profiles: Pick<Profile, "handle" | "display_name" | "follower_count" | "avatar_path"> | null;
  project_tags?: { tag: string }[];
  project_screenshots?: { id: string; storage_path: string; sort_order: number }[];
  project_files?: {
    file_name: string;
    storage_path: string | null;
    external_url: string | null;
    size_bytes: number | null;
  }[];
  project_store_links?: { store: string; url: string }[];
  comment_count?: number;
};

const PROJECT_SELECT = `
  *,
  profiles!projects_owner_id_fkey ( handle, display_name, follower_count, avatar_path ),
  project_tags ( tag ),
  project_screenshots ( id, storage_path, sort_order ),
  project_files ( file_name, storage_path, external_url, size_bytes ),
  project_store_links ( store, url ),
  project_comments ( count )
`;

const CATALOGUE_SELECT = `
  id, title, slug, tagline, description, cover_path, play_count, view_count, like_count,
  created_at, embeddable, kind, play_url,
  profiles!projects_owner_id_fkey ( handle, display_name ),
  project_tags ( tag )
`;

const DOWNLOADS_SELECT = `
  id, title,
  project_files ( file_name, storage_path, external_url, size_bytes )
`;

const CATALOGUE_CACHE_KEY = "showcase.catalogue.v2";
const CATALOGUE_TTL_MS = 5 * 60 * 1000;

type CatalogueCache = { at: number; games: Game[] };

export function readCatalogueCache(): { games: Game[]; fresh: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CATALOGUE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogueCache;
    if (!parsed || !Array.isArray(parsed.games)) return null;
    return { games: parsed.games, fresh: Date.now() - parsed.at < CATALOGUE_TTL_MS };
  } catch {
    return null;
  }
}

function writeCatalogueCache(games: Game[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CATALOGUE_CACHE_KEY, JSON.stringify({ at: Date.now(), games } satisfies CatalogueCache));
  } catch {
    // quota or private mode — skip
  }
}

export async function fetchCatalogueGames(opts?: { force?: boolean }): Promise<Game[]> {
  if (!opts?.force) {
    const cached = readCatalogueCache();
    if (cached?.fresh) return cached.games;
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(CATALOGUE_SELECT)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return readCatalogueCache()?.games ?? [];
  }
  const games = ((data ?? []) as unknown as ProjectRecord[]).map(projectToGame);
  writeCatalogueCache(games);
  return games;
}

export async function fetchPublishedProjects(): Promise<ProjectRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as unknown as ProjectRecord[];
}

export async function fetchPublishedDownloads(): Promise<ProjectRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(DOWNLOADS_SELECT)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as unknown as ProjectRecord[];
}

export function isPersistedId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function fetchProjectById(id: string) {
  if (!isPersistedId(id)) return null;
  const supabase = createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_SELECT).eq("id", id).maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return (data as unknown as ProjectRecord | null) ?? null;
}

export async function fetchProjectByHandleSlug(handle: string, slug: string) {
  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("handle", handle).maybeSingle();
  if (!profile) return null;
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("owner_id", profile.id)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return (data as unknown as ProjectRecord | null) ?? null;
}

export async function fetchProfileByHandle(handle: string) {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").eq("handle", handle).maybeSingle();
  return data;
}

export type SearchProfile = {
  id: string;
  handle: string;
  display_name: string;
  avatar_path: string | null;
  follower_count: number;
};

export async function searchProfiles(query: string): Promise<SearchProfile[]> {
  const q = query.trim().replace(/^@+/, "").toLowerCase().replace(/[%_,()]/g, "").slice(0, 48);
  if (!q) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_path, follower_count")
    .or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order("follower_count", { ascending: false })
    .limit(8);
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as SearchProfile[];
}

export async function countProfiles(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
  if (error) {
    console.error(error);
    return 0;
  }
  return count ?? 0;
}

export function clearCatalogueCache() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CATALOGUE_CACHE_KEY);
  } catch {
    // private mode
  }
}

export type StatDay = { project_id: string; day: string; views: number; plays: number };

export async function fetchOwnerStatDays(sinceDay: string): Promise<StatDay[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_stat_days")
    .select("project_id, day, views, plays")
    .gte("day", sinceDay)
    .order("day", { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as StatDay[];
}

export async function fetchProjectsForOwner(ownerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [] as ProjectRecord[];
  }
  return ((data ?? []) as unknown as (ProjectRecord & { project_comments?: { count: number }[] })[]).map(
    (row) => {
      const count = row.project_comments?.[0]?.count ?? 0;
      const { project_comments: _comments, ...rest } = row;
      return { ...rest, comment_count: count };
    },
  );
}

export async function fetchProjectsForHandle(handle: string) {
  const profile = await fetchProfileByHandle(handle);
  if (!profile) return { profile: null, projects: [] as ProjectRecord[] };
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select(CATALOGUE_SELECT)
    .eq("owner_id", profile.id)
    .eq("published", true)
    .order("created_at", { ascending: false });
  return { profile, projects: (data ?? []) as unknown as ProjectRecord[] };
}

export function projectToGame(project: ProjectRecord): Game {
  const shots = [...(project.project_screenshots ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => publicMediaUrl(s.storage_path));
  const hosted =
    project.kind === "html" && isPersistedId(project.id) && project.profiles?.handle && project.slug;
  const play = hosted
    ? projectEmbedUrl(project.profiles!.handle, project.slug)
    : project.play_url.startsWith("http")
      ? project.play_url
      : publicMediaUrl(project.play_url) || project.play_url;
  return {
    id: project.id,
    title: project.title,
    developer: project.profiles?.display_name || project.profiles?.handle || "Creator",
    description: project.tagline || project.description || project.title,
    playUrl: play,
    thumbnailUrl: publicMediaUrl(project.cover_path),
    screenshots: shots,
    embeddable: project.embeddable && (project.kind === "html" || Boolean(project.play_url)),
    tags: (project.project_tags ?? []).map((t) => t.tag),
    createdAt: project.created_at,
    playCount: project.play_count,
    viewCount: project.view_count,
    likeCount: project.like_count,
    promotionBoost: 0,
    channelHandle: project.profiles?.handle,
    projectSlug: project.slug,
  };
}

export function gameToProjectRecord(game: Game): ProjectRecord {
  const handle = game.channelHandle || slugify(game.developer);
  return {
    id: game.id,
    title: game.title,
    slug: game.projectSlug || game.id,
    tagline: "",
    description: game.description,
    play_url: game.playUrl,
    embeddable: game.embeddable,
    kind: game.embeddable ? "html" : "external",
    cover_path: game.thumbnailUrl || null,
    created_at: game.createdAt,
    updated_at: game.createdAt,
    play_count: game.playCount,
    view_count: game.viewCount ?? 0,
    like_count: game.likeCount,
    owner_id: "",
    classification: "games",
    community: "disabled",
    contains_ai: false,
    custom_noun: "game",
    genre: game.tags[0] ?? null,
    min_price: null,
    pricing_type: "no_payments",
    published: true,
    release_status: "released",
    suggested_donation: null,
    trailer_url: null,
    profiles: {
      handle,
      display_name: game.developer,
      follower_count: 0,
      avatar_path: null,
    },
    project_tags: game.tags.map((tag) => ({ tag })),
    project_screenshots: game.screenshots.map((storage_path, sort_order) => ({
      id: `${game.id}-shot-${sort_order}`,
      storage_path,
      sort_order,
    })),
    project_files: [],
    project_store_links: [],
  };
}
