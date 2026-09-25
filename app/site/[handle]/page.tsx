"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChannelHero } from "@/components/ChannelHero";
import { GameCard } from "@/components/GameCard";
import { LinkButton } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { publicMediaUrl } from "@/lib/media";
import { maxPopularity } from "@/lib/popularity";
import { fetchProjectsForHandle, projectToGame } from "@/lib/projects";
import { useGames } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import type { Game } from "@/lib/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function CreatorSitePage() {
  const { handle } = useParams<{ handle: string }>();
  const { user, profile: me, refresh } = useAuth();
  const { profile: local } = useGames();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProjectsForHandle(handle).then((res) => {
      if (cancelled) return;
      setProfile(res.profile);
      setGames(res.projects.map(projectToGame));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  useEffect(() => {
    if (!user || !profile || me?.handle !== profile.handle) return;
    const next = (me.bio || local?.bio || "").trim();
    if (!next || profile.bio) return;
    void createClient()
      .from("profiles")
      .update({ bio: next })
      .eq("id", user.id)
      .then(({ error }) => {
        if (error) return;
        setProfile((row) => (row ? { ...row, bio: next } : row));
        void refresh();
      });
  }, [user, profile, me, local?.bio, refresh]);

  if (!loaded) return <p className="text-sm text-muted">Loading…</p>;
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-xl font-semibold">Creator not found</h1>
        <LinkButton href="/" variant="primary" className="mt-6">
          Back to catalogue
        </LinkButton>
      </div>
    );
  }

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
