import type { MetadataRoute } from "next";
import { isCuratedHandle } from "@/lib/curation";
import { sitemapPaths } from "@/lib/game-seo";
import { apexHref, projectPublicUrl, siteOrigin } from "@/lib/host";
import { ownerHandle } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";

// Public pages, creator sites, and published games. Read anonymously, so only published games
// appear and the result can be cached. Rebuilt at most once an hour.
export const revalidate = 3600;

const PAGES = ["/", "/top", "/privacy", "/terms"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = PAGES.map((path) => ({ url: apexHref(path) }));
  const { data, error } = await createClient()
    .from("projects")
    .select("slug, profiles!projects_owner_id_fkey ( handle )")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) {
    // Still serve the static pages rather than failing the whole sitemap.
    console.error(error);
    return pages;
  }

  // Curated games (#9) stay out of search until their creators claim them.
  const rows = (data ?? [])
    .map((row) => ({ slug: row.slug, handle: ownerHandle(row.profiles) }))
    .filter((row) => !isCuratedHandle(row.handle));
  const { creators, games } = sitemapPaths(rows);
  return [
    ...pages,
    ...creators.map((handle) => ({ url: siteOrigin(handle) })),
    ...games.map(({ handle, slug }) => ({ url: projectPublicUrl(handle, slug) })),
  ];
}
