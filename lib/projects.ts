import { curationFromRow } from "@/lib/curation";
import { slugify } from "@/lib/format";
import { focalOrCenter } from "@/lib/media-standard";
import { flashStoragePrefix, htmlStoragePrefix } from "@/lib/html-game";
import { projectEmbedUrl } from "@/lib/host";
import { MEDIA_BUCKET, publicMediaUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Game } from "@/lib/types";
import { normalizeControls } from "@/lib/device";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type CurationRow = Database["public"]["Tables"]["project_curation"]["Row"];

export type ProjectRecord = Project & {
  profiles: Pick<Profile, "handle" | "display_name" | "follower_count" | "avatar_path"> & { bio?: string | null } | null;
  project_tags?: { tag: string }[];
  project_screenshots?: {
    id: string;
    storage_path: string;
    sort_order: number;
    width?: number | null;
    height?: number | null;
    kind?: string;
  }[];
  project_files?: {
    file_name: string;
    storage_path: string | null;
    external_url: string | null;
    size_bytes: number | null;
  }[];
  project_store_links?: { store: string; url: string }[];
  comment_count?: number;
  /** Credit for a curated game (#9), attached by withCuration(). Absent for a creator's own game. */
  project_curation?: Partial<CurationRow> | null;
};

export const PROJECT_SELECT = `
  *,
  profiles!projects_owner_id_fkey ( handle, display_name, follower_count, avatar_path, bio ),
  project_tags ( tag ),
  project_screenshots ( id, storage_path, sort_order ),
  project_files ( file_name, storage_path, external_url, size_bytes ),
  project_store_links ( store, url ),
  project_comments ( count )
`;

const CATALOGUE_SELECT = `
  id, title, slug, tagline, description, cover_path, play_count, view_count, like_count,
  created_at, embeddable, kind, play_url,
  profiles!projects_owner_id_fkey ( handle, display_name, avatar_path ),
  project_tags ( tag )
`;

const CATALOGUE_MEDIA_SELECT = `
  id, title, slug, tagline, description, cover_path, cover_portrait_path, cover_focal_x, cover_focal_y, preview_clip_path,
  play_count, view_count, like_count,
  created_at, embeddable, kind, play_url,
  profiles!projects_owner_id_fkey ( handle, display_name, avatar_path ),
  project_tags ( tag )
`;

// controls arrive with 20261114130000_project_controls.sql (#38). Until it runs, the catalogue read
// falls back to the select without it, so the homepage keeps working.
const CATALOGUE_DEVICE_SELECT = CATALOGUE_MEDIA_SELECT.replace("created_at, embeddable", "created_at, controls, embeddable");

const CURATION_SELECT_BASE =
  "project_id, status, play_mode, creator_name, creator_url, source_url, source_code_url, license, license_url, modified";
// frame_width/height arrive with 20261111100000_curated_playable_games.sql. Until it runs, the read
// falls back to the base columns so curated badges keep working.
const CURATION_SELECT = `${CURATION_SELECT_BASE}, frame_width, frame_height`;

/** Either Supabase client (browser or server); both are typed with Database. */
type Client = Pick<SupabaseClient<Database>, "from">;

/**
 * Attach curated-game credit (project_curation) to project rows.
 * A separate query on purpose: if the table is missing or the read fails, the rows come back
 * unchanged and every page keeps working, just without curated badges.
 */
export async function withCuration<T extends { id: string }>(
  supabase: Client,
  rows: T[],
): Promise<(T & { project_curation?: Partial<CurationRow> | null })[]> {
  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id).filter(isPersistedId);
  if (!ids.length) return rows;
  // Few rows: ask for those. Many (the catalogue): the table is small, so read the active ones.
  const scope = <Q extends { in: (column: string, values: string[]) => Q }>(query: Q) =>
    ids.length <= 50 ? query.in("project_id", ids) : query.in("status", ["listed", "claim_pending"]);
  const full = await scope(supabase.from("project_curation").select(CURATION_SELECT));
  const { data, error }: { data: Partial<CurationRow>[] | null; error: unknown } = full.error
    ? await scope(supabase.from("project_curation").select(CURATION_SELECT_BASE))
    : full;
  if (error || !data) return rows;
  const byId = new Map(data.map((row) => [row.project_id, row]));
  return rows.map((r) => (byId.has(r.id) ? { ...r, project_curation: byId.get(r.id) } : r));
}

const DOWNLOADS_SELECT = `
  id, title,
  project_files ( file_name, storage_path, external_url, size_bytes )
`;

const CATALOGUE_CACHE_KEY = "showcase.catalogue.v4";
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

async function selectCatalogue(supabase: ReturnType<typeof createClient>) {
  const device = await supabase
    .from("projects")
    .select(CATALOGUE_DEVICE_SELECT)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (!device.error) return device;
  const media = await supabase
    .from("projects")
    .select(CATALOGUE_MEDIA_SELECT)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (!media.error) return media;
  return supabase
    .from("projects")
    .select(CATALOGUE_SELECT)
    .eq("published", true)
    .order("created_at", { ascending: false });
}

export async function fetchCatalogueGames(opts?: { force?: boolean }): Promise<Game[]> {
  if (!opts?.force) {
    const cached = readCatalogueCache();
    if (cached?.fresh) return cached.games;
  }
  const supabase = createClient();
  const { data, error } = await selectCatalogue(supabase);
  if (error) {
    console.error(error);
    return readCatalogueCache()?.games ?? [];
  }
  const rows = await withCuration(supabase, (data ?? []) as unknown as ProjectRecord[]);
  const games = rows.map(projectToGame);
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

/**
 * The owner's handle from an embedded `profiles!projects_owner_id_fkey ( handle )` select.
 * PostgREST returns one object (a game has one owner); the generated types say array, so accept both.
 */
export function ownerHandle(embed: { handle: string } | { handle: string }[] | null | undefined) {
  return (Array.isArray(embed) ? embed[0]?.handle : embed?.handle) || null;
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
  if (!data) return null;
  const [record] = await withCuration(supabase, [data as unknown as ProjectRecord]);
  return record;
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
  if (!data) return null;
  const [record] = await withCuration(supabase, [data as unknown as ProjectRecord]);
  return record;
}

export async function fetchProfileByHandle(handle: string) {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").eq("handle", handle).maybeSingle();
  return data;
}

export function clearCatalogueCache() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CATALOGUE_CACHE_KEY);
  } catch {
    // private mode
  }
}

function isStoragePath(path: string) {
  return !path.startsWith("http://") && !path.startsWith("https://") && !path.startsWith("/");
}

async function listStorageTree(supabase: SupabaseClient, prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error || !data) return [];

  const paths: string[] = [];
  for (const entry of data) {
    const path = `${prefix}/${entry.name}`;
    if (entry.metadata) paths.push(path);
    else paths.push(...(await listStorageTree(supabase, path)));
  }
  return paths;
}

export async function deleteProject(project: ProjectRecord): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPersistedId(project.id)) {
    return { ok: false, error: "This listing cannot be deleted." };
  }

  const supabase = createClient();
  const storagePaths = new Set<string>();

  if (project.cover_path && isStoragePath(project.cover_path)) storagePaths.add(project.cover_path);
  if (project.cover_portrait_path && isStoragePath(project.cover_portrait_path)) storagePaths.add(project.cover_portrait_path);
  if (project.cover_original_path && isStoragePath(project.cover_original_path)) storagePaths.add(project.cover_original_path);
  if (project.preview_clip_path && isStoragePath(project.preview_clip_path)) storagePaths.add(project.preview_clip_path);
  for (const shot of project.project_screenshots ?? []) {
    if (isStoragePath(shot.storage_path)) storagePaths.add(shot.storage_path);
  }
  for (const file of project.project_files ?? []) {
    if (file.storage_path && isStoragePath(file.storage_path)) storagePaths.add(file.storage_path);
  }

  if (project.kind === "html") {
    for (const path of await listStorageTree(supabase, htmlStoragePrefix(project.owner_id, project.id))) {
      storagePaths.add(path);
    }
  } else if (project.kind === "flash") {
    for (const path of await listStorageTree(supabase, flashStoragePrefix(project.owner_id, project.id))) {
      storagePaths.add(path);
    }
    if (project.play_url && isStoragePath(project.play_url)) storagePaths.add(project.play_url);
  }

  const { error } = await supabase.from("projects").delete().eq("id", project.id).eq("owner_id", project.owner_id);
  if (error) return { ok: false, error: error.message };

  const paths = [...storagePaths];
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
    if (storageError) console.error(storageError);
  }

  clearCatalogueCache();
  return { ok: true };
}

export type StatDay = { project_id: string; day: string; views: number; plays: number };

function utcDayDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function sumPlaysByProject(rows: { project_id: string; plays: number | null }[] | null) {
  const totals: Record<string, number> = {};
  for (const row of rows ?? []) {
    const id = row.project_id;
    totals[id] = (totals[id] ?? 0) + (row.plays ?? 0);
  }
  return totals;
}

/** Plays per published project on the current UTC day (rankings: Today). */
export async function fetchCatalogueDailyPlays(): Promise<Record<string, number>> {
  const day = utcDayDaysAgo(0);
  const supabase = createClient();
  const { data, error } = await supabase.from("project_stat_days").select("project_id, plays").eq("day", day);
  if (error) {
    console.error("fetchCatalogueDailyPlays", error.message);
    return {};
  }
  return sumPlaysByProject(data);
}

/** Sum of `plays` per published project over the last 7 UTC days (homepage trends). */
export async function fetchCatalogueWeeklyPlays(): Promise<Record<string, number>> {
  const sinceDay = utcDayDaysAgo(7);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_stat_days")
    .select("project_id, plays")
    .gte("day", sinceDay);
  if (error) {
    console.error("fetchCatalogueWeeklyPlays", error.message);
    return {};
  }
  return sumPlaysByProject(data);
}

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
      const rest = { ...row };
      delete rest.project_comments;
      return { ...rest, comment_count: count };
    },
  );
}

export async function fetchProjectsForHandle(handle: string) {
  const profile = await fetchProfileByHandle(handle);
  if (!profile) return { profile: null, projects: [] as ProjectRecord[] };
  const supabase = createClient();
  const media = await supabase
    .from("projects")
    .select(CATALOGUE_MEDIA_SELECT)
    .eq("owner_id", profile.id)
    .eq("published", true)
    .order("created_at", { ascending: false });
  const { data } = media.error
    ? await supabase
        .from("projects")
        .select(CATALOGUE_SELECT)
        .eq("owner_id", profile.id)
        .eq("published", true)
        .order("created_at", { ascending: false })
    : media;
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
  const focal = focalOrCenter(project.cover_focal_x, project.cover_focal_y);
  const curated = curationFromRow(project.project_curation);
  const portrait = publicMediaUrl(project.cover_portrait_path);
  const clip = publicMediaUrl(project.preview_clip_path);
  return {
    id: project.id,
    title: project.title,
    // A curated game credits its original creator, never the `listed` system account.
    developer: curated?.creatorName || project.profiles?.display_name || project.profiles?.handle || "Creator",
    description: project.tagline || project.description || project.title,
    playUrl: play,
    thumbnailUrl: publicMediaUrl(project.cover_path),
    portraitUrl: portrait || undefined,
    focalX: focal.x,
    focalY: focal.y,
    previewClipUrl: clip || undefined,
    previewClipKind: clip.toLowerCase().includes(".gif") ? "gif" : clip ? "video" : undefined,
    screenshots: shots,
    embeddable: project.embeddable && (project.kind === "html" || Boolean(project.play_url)),
    tags: (project.project_tags ?? []).map((t) => t.tag),
    // Undefined when the catalogue was read before the controls migration ran.
    controls: normalizeControls(project.controls),
    createdAt: project.created_at,
    playCount: project.play_count,
    viewCount: project.view_count,
    likeCount: project.like_count,
    promotionBoost: 0,
    channelHandle: project.profiles?.handle,
    creatorAvatarUrl: curated ? undefined : publicMediaUrl(project.profiles?.avatar_path) || undefined,
    projectSlug: project.slug,
    ...(curated ? { curated } : {}),
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
    html_build_name: null,
    cover_path: game.thumbnailUrl || null,
    cover_portrait_path: game.portraitUrl || null,
    cover_original_path: null,
    cover_focal_x: game.focalX ?? 0.5,
    cover_focal_y: game.focalY ?? 0.5,
    preview_clip_path: game.previewClipUrl || null,
    created_at: game.createdAt,
    updated_at: game.createdAt,
    play_count: game.playCount,
    view_count: game.viewCount ?? 0,
    like_count: game.likeCount,
    owner_id: "",
    classification: "games",
    controls: game.controls ?? [],
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
      width: null,
      height: null,
      kind: "image",
    })),
    project_files: [],
    project_store_links: [],
  };
}
