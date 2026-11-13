"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ds/skeleton";
import { TallCard } from "@/components/home/cards";
import { fetchCatalogueGames } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";
import type { Game } from "@/lib/types";

const LIMIT = 12;

/** Games this profile played inside PlayInWeb, newest first. Shown on profiles without games. */
export function RecentlyPlayed({ profileId, gridClassName }: { profileId: string; gridClassName: string }) {
  const [result, setResult] = useState<{ id: string; games: Game[] } | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const { data, error } = await createClient()
        .from("profile_plays")
        .select("project_id")
        .eq("profile_id", profileId)
        .order("last_played_at", { ascending: false })
        .limit(LIMIT);
      const ids = error ? [] : (data ?? []).map((r) => r.project_id);
      const catalogue = ids.length ? await fetchCatalogueGames() : [];
      const byId = new Map(catalogue.map((g) => [g.id, g]));
      if (live) setResult({ id: profileId, games: ids.flatMap((id) => byId.get(id) ?? []) });
    })();
    return () => {
      live = false;
    };
  }, [profileId]);

  const games = result?.id === profileId ? result.games : null;
  if (!games) {
    return (
      <div className={gridClassName} aria-busy="true" aria-label="Loading recently played games">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-pw-xl" />
        ))}
      </div>
    );
  }
  if (games.length === 0) {
    return (
      <EmptyState
        kind="user"
        illustration="first-use"
        title="Nothing played yet"
        body="Games played on PlayInWeb will show up here."
      />
    );
  }
  return (
    <div className={gridClassName}>
      {games.map((game, i) => (
        <TallCard key={game.id} game={game} i={i} />
      ))}
    </div>
  );
}
