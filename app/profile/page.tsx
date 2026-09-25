"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChannelHero } from "@/components/ChannelHero";
import { ProfileForm } from "@/components/ProfileForm";
import { GameRail, Shelf } from "@/components/Shelf";
import { useAuth } from "@/lib/auth";
import { siteOrigin } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";
import { maxPopularity } from "@/lib/popularity";
import { gamesForChannel, historyGames, useGames } from "@/lib/store";

export default function ProfilePage() {
  const { user, profile: me, signOut } = useAuth();
  const { games, profile, history, myGameIds, removeFromHistory } = useGames();
  const params = useSearchParams();
  const router = useRouter();
  const editing = params.get("edit") === "1";
  const setupHandle = params.get("setup") === "handle";
  const max = maxPopularity(games);
  const recent = historyGames(games, history);
  const listed = profile
    ? gamesForChannel(games, profile.handle, {
        myGameIds,
        profileHandle: profile.handle,
      })
    : [];

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

      <Shelf title="Play history">
        {recent.length > 0 ? (
          <GameRail games={recent} maxScore={max} onRemove={removeFromHistory} />
        ) : (
          <EmptyShelf
            title="Your play history lives here"
            body="Games you play show up in this row. Use the × on a card to remove it."
          />
        )}
      </Shelf>

      <Shelf title="Your games" href={siteOrigin(profile.handle)} hrefLabel="See all games">
        {listed.length > 0 ? (
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
