"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { GameCard } from "@/components/GameCard";
import { HomeHero } from "@/components/HomeHero";
import { GameRail, Shelf } from "@/components/Shelf";
import { Segmented } from "@/components/ui/segmented";
import { formatPlays } from "@/lib/format";
import { siteOrigin } from "@/lib/host";
import { cachedAvatarUrl } from "@/lib/media";
import { maxPopularity } from "@/lib/popularity";
import { isPersistedId, searchProfiles, countProfiles, type SearchProfile } from "@/lib/projects";
import {
  creatorsFromGames,
  filterGames,
  historyGames,
  homeMoreGames,
  homeRailGames,
  sortGames,
  useGames,
  type BrowseSort,
} from "@/lib/store";

function asSort(value: string | null): BrowseSort {
  if (value === "new" || value === "rated") return value;
  return "popular";
}

export default function HomePage() {
  const { games, history } = useGames();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const tag = params.get("tag") ?? "";
  const sort = asSort(params.get("sort"));
  const max = maxPopularity(games);
  const recent = historyGames(games, history);
  const browsing = Boolean(q || tag);
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [players, setPlayers] = useState(0);

  useEffect(() => {
    let cancelled = false;
    countProfiles().then((n) => {
      if (!cancelled) setPlayers(n);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setProfiles([]);
      return;
    }
    let cancelled = false;
    searchProfiles(q).then((rows) => {
      if (!cancelled) setProfiles(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [q]);

  const creators = useMemo(() => {
    if (!q.trim()) return [] as SearchProfile[];
    const local = creatorsFromGames(games, q);
    const seen = new Set(profiles.map((p) => p.handle.toLowerCase()));
    const extras = local
      .filter((p) => !seen.has(p.handle.toLowerCase()))
      .map((p) => ({
        id: p.handle,
        handle: p.handle,
        display_name: p.name,
        avatar_path: null,
        follower_count: 0,
      }));
    return [...profiles, ...extras];
  }, [games, profiles, q]);

  const creatorStats = useMemo(() => {
    const map = new Map<string, { games: number; plays: number }>();
    for (const game of games) {
      const handle = game.channelHandle?.toLowerCase();
      if (!handle) continue;
      const cur = map.get(handle) ?? { games: 0, plays: 0 };
      cur.games += 1;
      cur.plays += game.playCount;
      map.set(handle, cur);
    }
    return map;
  }, [games]);

  let listed = filterGames(games, q);
  if (tag) listed = listed.filter((g) => g.tags.includes(tag));
  listed = sortGames(listed, sort);

  const href = (next: { q?: string; tag?: string; sort?: BrowseSort }) => {
    const sp = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextTag = next.tag === undefined ? tag : next.tag;
    const nextSort = next.sort ?? sort;
    if (nextQ) sp.set("q", nextQ);
    if (nextTag) sp.set("tag", nextTag);
    if (nextSort !== "popular") sp.set("sort", nextSort);
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  };

  const sorts: { id: BrowseSort; label: string }[] = [
    { id: "popular", label: "Popular" },
    { id: "new", label: "New" },
    { id: "rated", label: "Top rated" },
  ];

  if (!browsing) {
    const live = games.filter((g) => isPersistedId(g.id));
    const featured = homeRailGames(games);
    const more = homeMoreGames(games, featured);

    return (
      <div className="flex min-w-0 flex-col gap-8">
        <HomeHero
          stats={[
            { value: live.length, label: "Games" },
            { value: live.reduce((n, g) => n + g.playCount, 0), label: "Plays" },
            {
              value: players,
              label: "Players",
            },
          ]}
        />
        {games.length === 0 ? (
          <p className="rounded-2xl bg-surface-2 px-5 py-10 text-center text-ui text-text-muted">
            No games published yet.
          </p>
        ) : (
          <section className="min-w-0">
            <GameRail games={featured} maxScore={max} variant="promo" />
          </section>
        )}
        {more.length > 0 ? (
          <Shelf title="More games">
            <GameRail games={more} maxScore={max} variant="promo" />
          </Shelf>
        ) : null}
        {recent.length > 0 ? (
          <Shelf title="Continue playing" href="/profile">
            <GameRail games={recent.slice(0, 8)} maxScore={max} variant="promo" />
          </Shelf>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-10">
      <h1 className="text-display font-semibold">
        {q ? `Results for “${q}”` : tag ? `#${tag}` : "Browse games"}
      </h1>

      {creators.length > 0 ? (
        <section>
          <p className="mb-3 text-ui text-text-muted">
            {creators.length} {creators.length === 1 ? "creator" : "creators"}
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((person) => {
              const stats = creatorStats.get(person.handle.toLowerCase()) ?? { games: 0, plays: 0 };
              return (
                <li key={person.handle}>
                  <Link
                    href={siteOrigin(person.handle)}
                    className="flex min-w-0 items-center gap-3 rounded-panel bg-surface-2 px-4 py-3 hover:bg-surface-3"
                  >
                    <Avatar
                      name={person.display_name}
                      src={cachedAvatarUrl(person.id, person.avatar_path) || undefined}
                      size={48}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-ui font-medium">{person.display_name || person.handle}</p>
                      <p className="truncate text-caption text-text-subtle">@{person.handle}</p>
                      <p className="mt-0.5 truncate text-caption text-text-subtle">
                        {stats.games} {stats.games === 1 ? "game" : "games"}
                        {" · "}
                        {formatPlays(stats.plays)} plays
                        {" · "}
                        {formatPlays(person.follower_count)}{" "}
                        {person.follower_count === 1 ? "follower" : "followers"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <Segmented
        aria-label="Sort games"
        className="w-fit self-start"
        value={sort}
        options={sorts.map((item) => ({ value: item.id, label: item.label, href: href({ sort: item.id }) }))}
      />

      <section>
        <p className="mb-5 text-ui text-text-muted">
          {listed.length} {listed.length === 1 ? "game" : "games"}
        </p>
        {listed.length === 0 ? (
          <p className="rounded-panel bg-surface-2 px-5 py-10 text-center text-ui text-text-muted">
            {creators.length > 0 ? "No games match that filter." : "No games or creators match that filter."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listed.map((game) => (
              <GameCard key={game.id} game={game} maxScore={max} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
