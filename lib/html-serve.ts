import { contentType, htmlStoragePrefix } from "@/lib/html-game";
import { apexOrigin } from "@/lib/host";
import { MEDIA_BUCKET } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";

export async function serveProjectHtml(handle: string, slug: string, rel: string) {
  const path = (rel || "index.html").replace(/\\/g, "/");
  if (!path || path.includes("..") || path.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }

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
  const canView = project.published || user?.id === project.owner_id;
  if (!canView) {
    return new Response("Not found", { status: 404 });
  }

  const storagePath = `${htmlStoragePrefix(project.owner_id, project.id)}/${path}`;
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(storagePath);
  if (error || !data) return new Response("Not found", { status: 404 });

  return new Response(data, {
    headers: {
      "Content-Type": contentType(path),
      "Cache-Control": project.published ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      "Content-Security-Policy": `frame-ancestors 'self' ${apexOrigin()}`,
    },
  });
}
