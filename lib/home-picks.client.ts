"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Live hero + featured ids (admin picks). Refreshes on mount so the home shelves match Supabase after saves. */
export function useHomePickIds(serverHero: string[], serverFeatured: string[]) {
  const [heroIds, setHeroIds] = useState(serverHero);
  const [featuredIds, setFeaturedIds] = useState(serverFeatured);

  useEffect(() => {
    setHeroIds(serverHero);
    setFeaturedIds(serverFeatured);
  }, [serverHero, serverFeatured]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const [heroRes, featuredRes] = await Promise.all([
        supabase.from("home_hero_spotlights").select("project_id").order("sort_order", { ascending: true }),
        supabase.from("home_featured_games").select("project_id").order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      if (!heroRes.error && heroRes.data) {
        setHeroIds(heroRes.data.map((row) => row.project_id));
      }
      if (!featuredRes.error && featuredRes.data) {
        setFeaturedIds(featuredRes.data.map((row) => row.project_id));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { heroIds, featuredIds };
}
