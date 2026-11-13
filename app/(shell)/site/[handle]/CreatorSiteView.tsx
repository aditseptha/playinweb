"use client";

import { useEffect, useState } from "react";
import { BadgeShelf } from "@/components/badges/BadgeShelf";
import { EmptyState } from "@/components/ds/empty-state";
import { PortalScope } from "@/components/ds/portal";
import { TallCard } from "@/components/home/cards";
import s from "@/components/home/home.module.css";
import { HomeUiProvider } from "@/components/home/Peek";
import { ProfileHeader, ProfileStats } from "@/components/profile/ProfileHeader";
import { RecentlyPlayed } from "@/components/profile/RecentlyPlayed";
import { useFollow } from "@/components/profile/useFollow";
import { useAuth } from "@/lib/auth";
import { siteOrigin } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";
import { useGames } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import type { Game } from "@/lib/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const GAME_GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3";

/**
 * A profile (#30, "Explore B"): header card, stats, the profile's games (or what it played
 * recently when it has none), and the Badges panel beside them.
 */
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
  const isOwner = Boolean(user && user.id === profile.id);
  const follow = useFollow(profile.id, profile.follower_count);

  // A bio typed before sign-up lives in this browser; save it to the profile once.
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

  const plays = games.reduce((n, game) => n + game.playCount, 0);
  const likes = games.reduce((n, game) => n + game.likeCount, 0);
  const bio = (profile.bio || (isOwner ? me?.bio || local?.bio : "") || "").trim();

  return (
    <HomeUiProvider>
      <PortalScope>
        <div className={s.frame}>
          <div className={`${s.wrap} grid gap-6 pt-[84px] pb-16 md:pt-[100px]`}>
            <ProfileHeader
              name={profile.display_name}
              handle={profile.handle}
              bio={bio}
              joinedAt={profile.created_at}
              avatarUrl={publicMediaUrl(profile.avatar_path) || undefined}
              bannerUrl={publicMediaUrl(profile.banner_path) || undefined}
              profileUrl={siteOrigin(profile.handle)}
              isOwner={isOwner}
              following={follow.following}
              followBusy={follow.busy}
              onFollow={() => void follow.toggle()}
            />
            <ProfileStats
              stats={[
                { label: follow.followers === 1 ? "Follower" : "Followers", value: follow.followers },
                { label: games.length === 1 ? "Game" : "Games", value: games.length },
                { label: plays === 1 ? "Play" : "Plays", value: plays },
                { label: likes === 1 ? "Like" : "Likes", value: likes },
              ]}
            />
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section aria-labelledby="profile-games" className="min-w-0">
                <h2 id="profile-games" className="mb-4 flex items-baseline gap-3 font-pw-display text-pw-display-m font-extrabold uppercase italic leading-none text-pw-text">
                  {games.length > 0 ? "Games" : "Recently played"}
                  {games.length > 0 ? <span className="text-pw-muted">{games.length}</span> : null}
                </h2>
                {games.length > 0 ? (
                  <div className={GAME_GRID}>
                    {games.map((game, index) => (
                      <TallCard key={game.id} game={game} i={index} />
                    ))}
                  </div>
                ) : (
                  <RecentlyPlayed profileId={profile.id} gridClassName={GAME_GRID} />
                )}
              </section>
              <BadgeShelf profileId={profile.id} viewerId={user?.id ?? null} className="lg:sticky lg:top-24" />
            </div>
            {games.length === 0 && isOwner ? (
              <EmptyState
                kind="inline"
                title="Made a game?"
                body="Publish it from Manage games and it will show on your profile."
              />
            ) : null}
          </div>
        </div>
      </PortalScope>
    </HomeUiProvider>
  );
}
