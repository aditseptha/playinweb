import { NextResponse } from "next/server";
import { projectPublicUrl } from "@/lib/host";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string; path?: string[] }> },
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("slug, profiles!projects_owner_id_fkey ( handle )")
    .eq("id", id)
    .maybeSingle();
  const row = data as { slug?: string; profiles?: { handle: string } | { handle: string }[] | null } | null;
  const profile = Array.isArray(row?.profiles) ? row.profiles[0] : row?.profiles;
  const handle = profile?.handle;
  const slug = row?.slug;
  if (!handle || !slug) return new Response("Not found", { status: 404 });
  return NextResponse.redirect(`${projectPublicUrl(handle, slug)}?play=1`);
}
