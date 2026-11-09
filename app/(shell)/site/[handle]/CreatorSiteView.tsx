"use client";

import { useEffect, useState } from "react";
import { ChannelHero } from "@/components/ChannelHero";
import { TallCard } from "@/components/home/cards";
import s from "@/components/home/home.module.css";
import { HomeUiProvider } from "@/components/home/Peek";
import { useAuth } from "@/lib/auth";
import { publicMediaUrl } from "@/lib/media";
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
  const [prevInitial, setPrevInitial] = useState(initialProfile);
  if (prevInitial !== initialProfile) {
    setPrevInitial(initialProfile);
    setProfile(initialProfile);
  }

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

  const views = games.reduce((n, game) => n + (game.viewCount ?? 0), 0);
  const plays = games.reduce((n, game) => n + game.playCount, 0);

  return (
    <HomeUiProvider>
      <>
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
      <section className={s.channelGames}>
        <div className={s.frame}>
          <div className={s.wrap}>
            <div className={s.channelHead}>
              <h2>Games</h2>
            </div>
            {games.length === 0 ? (
              <div className={s.empty}>
                <h3>No published games yet</h3>
                <p>Games this creator publishes will show up here.</p>
              </div>
            ) : (
              <div className={s.grid}>
                {games.map((game, index) => (
                  <TallCard key={game.id} game={game} i={index} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      </>
    </HomeUiProvider>
  );
}
