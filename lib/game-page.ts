import type { Metadata } from "next";
import { cache } from "react";
import { gameDescription, gameJsonLd, gameTitle, jsonLdHtml, type GameSeoInput } from "@/lib/game-seo";
import { apexHref, apexOrigin, projectPublicUrl, siteOrigin } from "@/lib/host";
import { PROJECT_SELECT, isPersistedId, projectToGame, type ProjectRecord } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

// Data and metadata for the game page (/{handle}/{slug}, and /game/[id] which redirects there).
//
// Reads use the visitor's session, so a creator can open their own unpublished game; everyone else
// only gets published games (row-level security). fetchProjectById in lib/projects.ts stays
// anonymous on purpose: the Manage page calls it from the browser, and link-preview images must
// stay public. cache() lets generateMetadata and the page share one query per request.

/** PROJECT_SELECT embeds `project_comments ( count )`; flatten it to comment_count (replies included). */
function toRecord(row: unknown): ProjectRecord | null {
  if (!row) return null;
  const { project_comments: comments, ...rest } = row as ProjectRecord & { project_comments?: { count: number }[] };
  return { ...rest, comment_count: comments?.[0]?.count ?? 0 };
}

export const getGameById = cache(async (id: string) => {
  if (!isPersistedId(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_SELECT).eq("id", id).maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return toRecord(data);
});

/** How many published games the creator has, for "{n} games" on the creator card. */
export const getCreatorGameCount = cache(async (ownerId: string) => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("published", true);
  if (error) {
    console.error(error);
    return null;
  }
  return count ?? null;
});

export const getGameByHandleSlug = cache(async (handle: string, slug: string) => {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
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
  return toRecord(data);
});

/** The game's one public address, or null for a game without a creator handle or slug. */
export function gameCanonicalUrl(project: ProjectRecord) {
  const handle = project.profiles?.handle;
  return handle && project.slug ? projectPublicUrl(handle, project.slug) : null;
}

function seoInput(project: ProjectRecord): GameSeoInput {
  const handle = project.profiles?.handle ?? "";
  const cover = projectToGame(project).thumbnailUrl;
  return {
    title: project.title,
    tagline: project.tagline,
    description: project.description,
    creatorName: project.profiles?.display_name || handle || "Creator",
    creatorUrl: handle ? siteOrigin(handle) : apexOrigin(),
    url: gameCanonicalUrl(project) ?? apexHref(`/game/${project.id}`),
    image: cover ? (cover.startsWith("/") ? apexHref(cover) : cover) : null,
    genre: project.genre && project.genre !== "No genre" ? project.genre : null,
    plays: project.play_count,
    publishedAt: project.created_at,
  };
}

export function gameMetadata(project: ProjectRecord): Metadata {
  const input = seoInput(project);
  const title = gameTitle(input.title, input.creatorName);
  const description = gameDescription(input);
  return {
    title,
    description,
    alternates: { canonical: input.url },
    // The Open Graph image comes from the route's opengraph-image.tsx, which takes priority.
    openGraph: { type: "website", siteName: "PlayInWeb", title, description, url: input.url },
    twitter: { card: "summary_large_image", title, description },
    // Unpublished games only reach their owner, and must never be indexed.
    ...(project.published ? {} : { robots: { index: false, follow: false } }),
  };
}

/** JSON-LD for a published game, ready for dangerouslySetInnerHTML. Null for drafts. */
export function gameJsonLdHtml(project: ProjectRecord) {
  return project.published ? jsonLdHtml(gameJsonLd(seoInput(project))) : null;
}
