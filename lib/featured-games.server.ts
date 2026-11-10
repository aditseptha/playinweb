import { FEATURED_GAMES_MAX } from "@/lib/featured-games";
import { createClient } from "@/lib/supabase/client";

/** Public read; uses the anon client so it can run inside `unstable_cache` (no cookies). */
export async function fetchFeaturedGameIds(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("home_featured_games")
    .select("project_id")
    .order("sort_order", { ascending: true })
    .limit(FEATURED_GAMES_MAX);
  if (error) {
    console.error("home_featured_games", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.project_id);
}
