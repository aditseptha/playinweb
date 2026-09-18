import { getSupabaseEnv } from "@/lib/supabase/env";

export const MEDIA_BUCKET = "project-media";

export function publicMediaUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) return path;
  const { url } = getSupabaseEnv();
  return `${url}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

const avatarUrlById = new Map<string, string>();

export function cachedAvatarUrl(id: string | null | undefined, path?: string | null) {
  if (path) {
    const url = publicMediaUrl(path);
    if (url && id) avatarUrlById.set(id, url);
    return url;
  }
  return (id && avatarUrlById.get(id)) || "";
}

export function fileExt(name: string) {
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "bin";
  return ext.replace(/[^a-z0-9]/g, "") || "bin";
}
