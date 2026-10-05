"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChannelHero } from "@/components/ChannelHero";
import { ProfileForm } from "@/components/ProfileForm";
import { GameRail, Shelf } from "@/components/Shelf";
import { useAuth } from "@/lib/auth";
import type { Game } from "@/lib/types";
import { siteOrigin } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";
import { maxPopularity } from "@/lib/popularity";
import { fetchProjectsForOwner, projectToGame } from "@/lib/projects";
import { gamesForChannel, historyGames, useGames } from "@/lib/store";

function mergeGames(primary: Game[], extra: Game[]) {
  const seen = new Set(primary.map((g) => g.id));
  return [...primary, ...extra.filter((g) => !seen.has(g.id))];
}

export default function ProfilePage() {
  const { user, profile: me, signOut } = useAuth();
  const { games, profile, history, myGameIds, removeFromHistory } = useGames();
  const params = useSearchParams();
  const router = useRouter();
  const editing = params.get("edit") === "1";
  const setupHandle = params.get("setup") === "handle";
  const channelHandle = me?.handle ?? profile?.handle ?? "";
  const [loaded, setLoaded] = useState<{ uid: string; games: Game[] } | null>(null);
  // Games fetched for a different (or no) user count as not loaded yet.
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

  const max = maxPopularity(games);
  const recent = historyGames(games, history);
  const catalogueListed = channelHandle
    ? gamesForChannel(games, channelHandle, {
        myGameIds,
        profileHandle: channelHandle,
      })
    : [];
  const listed =
    user && ownerGames !== null ? mergeGames(ownerGames, catalogueListed) : catalogueListed;
  const gamesLoading = Boolean(user) && ownerGames === null;

  if (!profile || editing) {
    return (
      <div className="min-w-0 pt-4">
        <h1 className="text-display font-semibold tracking-tight">
          {me?.display_name || profile?.name || "You"}
        </h1>
        {setupHandle ? (
          <p className="mt-2 text-body text-text-muted">
            Pick a handle for your page — like <span className="text-text">yourname</span>.
          </p>
        ) : null}
        <div className="mt-8">
          <ProfileForm initial={profile} onSaved={() => router.replace("/profile")} />
        </div>
        {user ? (
          <button
            type="button"
            className="mt-10 block text-sm text-muted hover:text-text"
            onClick={() => {
              void signOut().then(() => router.replace("/"));
            }}
          >
            Sign out
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <ChannelHero
        name={me?.display_name || profile.name}
        handle={me?.handle || profile.handle}
        bio={me?.bio || profile.bio}
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

      {recent.length > 0 ? (
        <Shelf title="Play history">
          <GameRail games={recent} maxScore={max} onRemove={removeFromHistory} />
        </Shelf>
      ) : null}

      <Shelf title="Your games" href={siteOrigin(channelHandle)} hrefLabel="See all games">
        {gamesLoading ? (
          <p className="text-sm text-muted">Loading your games…</p>
        ) : listed.length > 0 ? (
          <GameRail games={listed} maxScore={max} />
        ) : (
          <EmptyShelf
            title="Create a game or playlist"
            body="Register a web game and it will appear on your channel and in this shelf."
            action={{ href: "/register", label: "Register a game" }}
          />
        )}
      </Shelf>
    </div>
  );
}

function EmptyShelf({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-panel bg-surface-2 px-5 py-10 text-center">
      <p className="font-medium text-text">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-surface-2 px-3.5 text-body font-medium hover:bg-surface-3"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
