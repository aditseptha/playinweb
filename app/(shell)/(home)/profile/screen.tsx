"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { DetailSkeleton, CatalogSkeleton } from "@/components/ds/skeleton";
import { EmptyState } from "@/components/ds/empty-state";
import { Button } from "@/components/ds/button";
import { BadgeShelf } from "@/components/badges/BadgeShelf";
import { ChannelHero } from "@/components/ChannelHero";
import { ProfileColumns } from "@/components/profile/ProfileColumns";
import { TallCard } from "@/components/home/cards";
import s from "@/components/home/home.module.css";
import { HomeUiProvider } from "@/components/home/Peek";
import { ProfileForm } from "@/components/ProfileForm";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { siteOrigin } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";
import { fetchProjectsForOwner, projectToGame } from "@/lib/projects";
import { gamesForChannel, historyGames, useGames } from "@/lib/store";
import type { Game } from "@/lib/types";

function mergeGames(primary: Game[], extra: Game[]) {
  const seen = new Set(primary.map((g) => g.id));
  return [...primary, ...extra.filter((g) => !seen.has(g.id))];
}

export function ProfileScreen() {
  const { user, profile: me, loading, signOut } = useAuth();
  const { games, profile, history, myGameIds, removeFromHistory } = useGames();
  const params = useSearchParams();
  const router = useRouter();
  const editing = params.get("edit") === "1";
  const setupHandle = params.get("setup") === "handle";
  const channelHandle = me?.handle ?? profile?.handle ?? "";
  const [loaded, setLoaded] = useState<{ uid: string; games: Game[] } | null>(null);
  const ownerGames = user && loaded?.uid === user.id ? loaded.games : null;

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function load() {
      const rows = await fetchProjectsForOwner(uid);
      if (!cancelled) setLoaded({ uid, games: rows.map(projectToGame) });
    }
    void load();
    function onShow() {
      if (document.visibilityState === "visible") void load();
    }
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [user]);

  const recent = historyGames(games, history);
  const catalogueListed = channelHandle
    ? gamesForChannel(games, channelHandle, {
        myGameIds,
        profileHandle: channelHandle,
      })
    : [];
  const listed = user && ownerGames !== null ? mergeGames(ownerGames, catalogueListed) : catalogueListed;
  const gamesLoading = Boolean(user) && ownerGames === null;
  const hasChannel = Boolean(me?.handle || profile?.handle);

  if (loading) {
    return (
      <div className={s.create}>
        <div className={s.frame}>
          <div className={s.wrap}>
            <DetailSkeleton label="Loading account" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasChannel || editing) {
    return (
      <HomeUiProvider>
      <div className={s.create}>
        <div className={s.frame}>
          <div className={s.wrap}>
            <p className={s.eyebrow}>Channel</p>
            <h1 className={s.createTitle}>{me?.display_name || profile?.name || "You"}</h1>
            {setupHandle ? (
              <p className={s.legalIntro}>
                Pick a handle for your page — like yourname.
              </p>
            ) : null}
            <div className={s.createForm}>
              <ProfileForm
                initial={
                  profile ??
                  (me?.handle
                    ? { name: me.display_name, handle: me.handle, bio: me.bio ?? "" }
                    : null)
                }
                onSaved={() => router.replace("/profile")}
              />
            </div>
            {user ? (
              <button
                type="button"
                className={s.channelSignOut}
                onClick={() => {
                  void signOut().then(() => router.replace("/"));
                }}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      </div>
      </HomeUiProvider>
    );
  }

  return (
    <HomeUiProvider>
      <>
      <ChannelHero
        name={me?.display_name || profile?.name || "You"}
        handle={me?.handle || profile?.handle || ""}
        bio={me?.bio || profile?.bio || ""}
        gameCount={listed.length}
        views={listed.reduce((n, game) => n + (game.viewCount ?? 0), 0)}
        plays={listed.reduce((n, game) => n + game.playCount, 0)}
        followers={me?.follower_count}
        avatarUrl={publicMediaUrl(me?.avatar_path) || undefined}
        bannerUrl={publicMediaUrl(me?.banner_path) || undefined}
        bannerPosition={me?.banner_position}
        showOwnerActions
        showSiteLink
        editable
      />

      <div className={s.frame}>
        <div className={cn(s.wrap, "pb-16")}>
          <ProfileColumns
            sideFirstOnPhone
            main={
              <div className="grid gap-12">
                {recent.length > 0 ? (
                  <GameSection title="Play history">
                    <div className={s.grid}>
                      {recent.map((game, index) => (
                        <div key={game.id}>
                          <TallCard game={game} i={index} />
                          <button type="button" className={s.channelRemove} onClick={() => removeFromHistory(game.id)}>
                            Remove from history
                          </button>
                        </div>
                      ))}
                    </div>
                  </GameSection>
                ) : null}
                <GameSection
                  title="Your games"
                  action={channelHandle ? { href: siteOrigin(channelHandle), label: "See all games" } : undefined}
                >
                  {gamesLoading ? (
                    <CatalogSkeleton label="Loading your games" />
                  ) : listed.length > 0 ? (
                    <div className={s.grid}>
                      {listed.map((game, index) => (
                        <TallCard key={game.id} game={game} i={index} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      kind="first-use"
                      illustration="first-use"
                      title="Create a game"
                      body="Register a web game and it will appear on your channel and in this shelf."
                      action={
                        <Button variant="primary" asChild>
                          <Link href="/register">Register a game</Link>
                        </Button>
                      }
                    />
                  )}
                </GameSection>
              </div>
            }
            side={
              user ? (
                <>
                  <BadgeShelf id="badges" profileId={user.id} viewerId={user.id} showCount />
                  {channelHandle ? (
                    <p className="mt-3 text-pw-caption text-pw-muted">
                      Everyone sees these on{" "}
                      <Link href={siteOrigin(channelHandle)} className="font-semibold text-pw-sky hover:underline">
                        your public profile
                      </Link>
                      .
                    </p>
                  ) : null}
                </>
              ) : null
            }
          />
        </div>
      </div>
      </>
    </HomeUiProvider>
  );
}

function GameSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className={s.channelHead}>
        <h2>{title}</h2>
        {action ? (
          <Link href={action.href} className={s.linkGold}>
            {action.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
