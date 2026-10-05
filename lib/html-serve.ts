import { unstable_cache } from "next/cache";
import { contentType, htmlStoragePrefix } from "@/lib/html-game";
import { apexOrigin } from "@/lib/host";
import { MEDIA_BUCKET, publicMediaUrl } from "@/lib/media";
import { createClient as createAnonClient } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";

/**
 * A game loads dozens of files, so the published lookup is cached: one query per minute
 * per game instead of a profile + project + auth round trip on every file.
 * ponytail: unstable_cache is superseded by "use cache"; switch once cacheComponents is enabled.
 */
const publishedHtmlProject = unstable_cache(
  async (handle: string, slug: string) => {
    const { data } = await createAnonClient()
      .from("projects")
      .select("id, owner_id, kind, profiles!projects_owner_id_fkey!inner ( handle )")
      .eq("slug", slug)
      .eq("published", true)
      .eq("profiles.handle", handle)
      .maybeSingle();
    return data?.kind === "html" ? { id: data.id, ownerId: data.owner_id } : null;
  },
  ["published-html-project"],
  { revalidate: 60 },
);

function headers(path: string, cacheControl: string) {
  return {
    "Content-Type": contentType(path),
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
    "Access-Control-Allow-Origin": "*",
    "Content-Security-Policy": `frame-ancestors 'self' ${apexOrigin()}`,
  };
}

export async function serveProjectHtml(handle: string, slug: string, rel: string) {
  const path = (rel || "index.html").replace(/\\/g, "/");
  if (!path || path.includes("..") || path.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }

  const published = await publishedHtmlProject(handle, slug);
  if (published) {
    // Stream from the public bucket instead of buffering the whole file in the function.
    const storagePath = `${htmlStoragePrefix(published.ownerId, published.id)}/${path}`;
    const upstream = await fetch(publicMediaUrl(storagePath.split("/").map(encodeURIComponent).join("/")), {
      cache: "no-store",
    });
    if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });
    // Serve stale while refreshing, so the CDN copy keeps answering after the hour is up.
    return new Response(upstream.body, {
      headers: headers(path, "public, max-age=3600, stale-while-revalidate=86400"),
    });
  }

  return serveDraftHtml(handle, slug, path);
}

/** Unpublished builds (owner only), plus games published within the lookup cache window. */
async function serveDraftHtml(handle: string, slug: string, path: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
  if (!profile) return new Response("Not found", { status: 404 });
  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id, published, kind")
    .eq("owner_id", profile.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!project || project.kind !== "html") {
    return new Response("Not found", { status: 404 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!project.published && user?.id !== project.owner_id) {
    return new Response("Not found", { status: 404 });
  }

  const storagePath = `${htmlStoragePrefix(project.owner_id, project.id)}/${path}`;
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(storagePath);
  if (error || !data) return new Response("Not found", { status: 404 });

  return new Response(data, {
    headers: headers(path, project.published ? "public, max-age=3600" : "private, no-store"),
  });
}
