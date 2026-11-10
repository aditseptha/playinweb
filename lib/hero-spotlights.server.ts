import { HERO_SPOTLIGHT_MAX } from "@/lib/hero-spotlights";
import { createClient } from "@/lib/supabase/client";

/** Public read; uses the anon client so it can run inside `unstable_cache` (no cookies). */
export async function fetchHeroSpotlightIds(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("home_hero_spotlights")
    .select("project_id")
    .order("sort_order", { ascending: true })
    .limit(HERO_SPOTLIGHT_MAX);
  if (error) {
    console.error("home_hero_spotlights", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.project_id);
}
