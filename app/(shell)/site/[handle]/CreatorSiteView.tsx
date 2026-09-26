"use client";

import { useEffect, useState } from "react";
import { ChannelHero } from "@/components/ChannelHero";
import { GameCard } from "@/components/GameCard";
import { useAuth } from "@/lib/auth";
import { publicMediaUrl } from "@/lib/media";
import { maxPopularity } from "@/lib/popularity";
import { useGames } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import type { Game } from "@/lib/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function CreatorSiteView({
  profile: initialProfile,
  games,
}: {
  profile: Profile;
  games: Game[];
}) {
  const { user, profile: me, refresh } = useAuth();
  const { profile: local } = useGames();
  const [profile, setProfile] = useState(initialProfile);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    if (!user || me?.handle !== profile.handle) return;
    const next = (me.bio || local?.bio || "").trim();
    if (!next || profile.bio) return;
    void createClient()
      .from("profiles")
      .update({ bio: next })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) return;
        setProfile((row) => ({ ...row, bio: next }));
        void refresh();
      });
  }, [user, profile.bio, profile.handle, me, local?.bio, refresh]);

  const max = maxPopularity(games.length ? games : [{ playCount: 1, promotionBoost: 0 } as Game]);
  const views = games.reduce((n, game) => n + (game.viewCount ?? 0), 0);
  const plays = games.reduce((n, game) => n + game.playCount, 0);

  return (
    <div className="flex min-w-0 flex-col">
      <ChannelHero
        name={profile.display_name}
        handle={profile.handle}
        bio={(profile.bio || (me?.handle === profile.handle ? me?.bio || local?.bio : "") || "").trim()}
        gameCount={games.length}
        views={views}
        plays={plays}
        followers={profile.follower_count}
        avatarUrl={publicMediaUrl(profile.avatar_path) || undefined}
        bannerUrl={publicMediaUrl(profile.banner_path) || undefined}
        bannerPosition={profile.banner_position}
      />
      {games.length === 0 ? (
        <p className="mt-10 rounded-panel bg-surface-2 px-5 py-10 text-center text-sm text-muted">No published games yet.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} maxScore={max} />
          ))}
        </div>
      )}
    </div>
  );
}
