"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { CreatorBanner, SignInBanner } from "@/components/home/Banners";
import { CategoryTabs } from "@/components/home/CategoryTabs";
import { CreatorChip, FeatureCard, PosterCard, SlotCard, WideCard } from "@/components/home/cards";
import { FeaturedHero } from "@/components/home/FeaturedHero";
import { FilterPanel } from "@/components/home/FilterPanel";
import {
  applyFilters,
  byNewest,
  byPopularity,
  capitalize,
  creatorsOf,
  filtersHref,
  isBrowsing,
  parseFilters,
  shelfTag,
  type Creator,
  type HomeFilters,
} from "@/components/home/filters";
import { Section, SectionHeading } from "@/components/home/Section";
import { IconCalendar, IconClock, IconGrid, IconHeart, IconStar, IconTrophy, IconUser } from "@/components/icons";
import { Segmented } from "@/components/ui/segmented";
import { useAuth } from "@/lib/auth";
import { formatPlays } from "@/lib/format";
import { siteOrigin } from "@/lib/host";
import { cachedAvatarUrl } from "@/lib/media";
import { searchProfiles, type SearchProfile } from "@/lib/projects";
import { catalogueTags, filterGames, historyGames, sortGames, useGames, type BrowseSort } from "@/lib/store";
import type { Game } from "@/lib/types";

/** Below this many games the page switches to the compact layout from the "5 game" comps. */
const SPARSE_LIMIT = 8;
const ICON = "h-5 w-5";

/** Server-fetched games fill in until the client catalogue loads; client copies win on overlap. */
function withInitial(games: Game[], initial: Game[]) {
  const seen = new Set(games.map((g) => g.id));
  return [...games, ...initial.filter((g) => !seen.has(g.id))];
}

export function HomeView({ initialGames }: { initialGames: Game[] }) {
  const store = useGames();
  const { user, loading } = useAuth();
  const games = useMemo(() => withInitial(store.games, initialGames), [store.games, initialGames]);
  const params = useSearchParams();
  const filters = parseFilters(params);
  const browsing = isBrowsing(filters);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const tags = useMemo(() => catalogueTags(games), [games]);
  const creators = useMemo(() => creatorsOf(games), [games]);
  const popular = useMemo(() => byPopularity(games), [games]);
  const hasFilters = tags.length > 0 || creators.length > 0;
  const signedOut = !loading && !user;

  return (
    <>
      {browsing ? <div className="h-[96px]" aria-hidden /> : <FeaturedHero game={popular[0] ?? null} />}
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 sm:px-6 lg:gap-8 lg:px-8">
        <FilterPanel
          filters={filters}
          tags={tags}
          creators={creators}
          mobileOpen={filtersOpen}
          onMobileClose={() => setFiltersOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-10">
          <CategoryTabs
            key={filters.q}
            filters={filters}
            tags={tags}
            onOpenFilters={hasFilters ? () => setFiltersOpen(true) : undefined}
          />
          {signedOut && !browsing ? <SignInBanner games={popular.slice(0, 3)} /> : null}
          {browsing ? (
            <BrowseResults games={games} filters={filters} />
          ) : games.length < SPARSE_LIMIT ? (
            <SparseShelves popular={popular} showCreatorBanner={Boolean(user)} />
          ) : (
            <FullShelves games={games} popular={popular} tags={tags} creators={creators} />
          )}
        </div>
      </div>
    </>
  );
}

function FullShelves({
  games,
  popular,
  tags,
  creators,
}: {
  games: Game[];
  popular: Game[];
  tags: string[];
  creators: Creator[];
}) {
  const { history } = useGames();
  const recent = historyGames(games, history).slice(0, 12);
  const newest = byNewest(games).slice(0, 12);
  const tag = shelfTag(tags, games);
  const tagged = tag ? popular.filter((g) => g.tags.includes(tag)).slice(0, 6) : [];

  return (
    <>
      <Section
        icon={<IconStar className={ICON} />}
        title="Featured games"
        href="/?view=all"
        size="feature"
        arrows="sides"
        items={popular.slice(0, 6).map((g, i) => <FeatureCard key={g.id} game={g} priority={i < 3} />)}
      />
      {recent.length > 0 ? (
        <Section
          icon={<IconClock className={ICON} />}
          title="Continue playing"
          href="/?view=recent"
          size="poster"
          items={recent.map((g) => <PosterCard key={g.id} game={g} badge={null} />)}
        />
      ) : null}
      <Section
        icon={<IconCalendar className={ICON} />}
        title="New releases"
        href="/?view=all&sort=new"
        size="poster"
        items={newest.map((g) => <PosterCard key={g.id} game={g} />)}
      />
      <Section
        icon={<IconTrophy className={ICON} />}
        title="Most played"
        href="/?view=all"
        size="poster"
        items={popular.slice(0, 12).map((g, i) => <PosterCard key={g.id} game={g} badge={i < 2 ? "top" : null} />)}
      />
      {tag && tagged.length > 0 ? (
        <Section
          icon={<IconGrid className={ICON} />}
          title={`${capitalize(tag)} games`}
          href={filtersHref({ tags: [tag] })}
          size="wide"
          items={tagged.map((g) => <WideCard key={g.id} game={g} />)}
        />
      ) : null}
      {creators.length > 0 ? (
        <section
          id="creators"
          aria-labelledby="creators-title"
          className="scroll-mt-24 rounded-[24px] border border-border bg-surface p-4 shadow-panel sm:p-5"
        >
          <SectionHeading id="creators-title" icon={<IconUser className={ICON} />} title="Popular creators" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {creators.slice(0, 5).map((c) => (
              <CreatorChip key={c.handle} creator={c} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function SparseShelves({ popular, showCreatorBanner }: { popular: Game[]; showCreatorBanner: boolean }) {
  const featured = popular.slice(0, 3);
  const community = popular.slice(3);

  return (
    <>
      {featured.length > 0 ? (
        <Section
          icon={<IconStar className={ICON} />}
          title="Featured games"
          size="feature"
          items={featured.map((g, i) => <FeatureCard key={g.id} game={g} priority={i < 3} />)}
        />
      ) : null}
      <Section
        id="creators"
        icon={<IconHeart className={ICON} />}
        title="From the community"
        size="poster"
        items={[...community.map((g) => <PosterCard key={g.id} game={g} />), <SlotCard key="slot" />]}
      />
      {showCreatorBanner ? <CreatorBanner games={popular.slice(0, 3)} /> : null}
    </>
  );
}

const NO_PROFILES: SearchProfile[] = [];

function BrowseResults({ games, filters }: { games: Game[]; filters: HomeFilters }) {
  const { liked, history } = useGames();
  const { q, view, sort } = filters;
  const [found, setFound] = useState<{ q: string; rows: SearchProfile[] }>({ q: "", rows: [] });
  const profiles = found.q === q ? found.rows : NO_PROFILES;

  useEffect(() => {
    if (!q.trim()) return;
    let cancelled = false;
    searchProfiles(q).then((rows) => {
      if (!cancelled) setFound({ q, rows });
    });
    return () => {
      cancelled = true;
    };
  }, [q]);

  const creatorStats = useMemo(() => new Map(creatorsOf(games).map((c) => [c.handle, c])), [games]);
  const people = useMemo(() => {
    if (!q.trim()) return [] as SearchProfile[];
    const seen = new Set(profiles.map((p) => p.handle.toLowerCase()));
    const needle = q.trim().toLowerCase();
    const extras = [...creatorStats.values()]
      .filter((c) => !seen.has(c.handle) && (c.handle.includes(needle) || c.name.toLowerCase().includes(needle)))
      .map((c) => ({ id: c.handle, handle: c.handle, display_name: c.name, avatar_path: null, follower_count: 0 }));
    return [...profiles, ...extras];
  }, [creatorStats, profiles, q]);

  let listed = applyFilters(filterGames(games, q), filters, { liked, history });
  if (view !== "recent") listed = sortGames(listed, sort);

  const title = q
    ? `Results for “${q}”`
    : view === "liked"
      ? "Liked games"
      : view === "recent"
        ? "Recently played"
        : filters.tags.length === 1 && !filters.creators.length
          ? `${capitalize(filters.tags[0])} games`
          : filters.tags.length || filters.creators.length
            ? "Filtered games"
            : "All games";

  const sorts: { value: BrowseSort; label: string }[] = [
    { value: "popular", label: "Popular" },
    { value: "new", label: "New" },
    { value: "rated", label: "Most liked" },
  ];

  const empty =
    view === "liked"
      ? "Games you like show up here."
      : view === "recent"
        ? "Games you play show up here."
        : people.length > 0
          ? "No games match that search."
          : "No games or creators match that.";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">{title}</h1>
          <p className="mt-1 text-ui text-text-muted tabular">
            {listed.length} {listed.length === 1 ? "game" : "games"}
          </p>
        </div>
        {view !== "recent" ? (
          <Segmented
            aria-label="Sort games"
            size="lg"
            value={sort}
            options={sorts.map((s) => ({ ...s, href: filtersHref({ ...filters, sort: s.value }) }))}
          />
        ) : null}
      </div>

      {people.length > 0 ? (
        <section aria-label="Creators">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {people.map((person) => {
              const stats = creatorStats.get(person.handle.toLowerCase());
              return (
                <li key={person.handle}>
                  <Link
                    href={siteOrigin(person.handle)}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3 hover:bg-surface-3"
                  >
                    <Avatar
                      name={person.display_name}
                      src={cachedAvatarUrl(person.id, person.avatar_path) || undefined}
                      size={44}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">
                        {person.display_name || person.handle}
                      </span>
                      <span className="block truncate text-caption text-text-subtle tabular">
                        @{person.handle} · {stats?.games ?? 0} {stats?.games === 1 ? "game" : "games"} ·{" "}
                        {formatPlays(person.follower_count)} {person.follower_count === 1 ? "follower" : "followers"}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {listed.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-border-strong px-6 py-14 text-center">
          <p className="text-body text-text-muted">{empty}</p>
          <Link href="/" className="mt-4 inline-flex text-ui font-semibold text-accent hover:underline">
            Back to all games
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {listed.map((game, i) => (
            <PosterCard key={game.id} game={game} priority={i < 6} />
          ))}
        </div>
      )}
    </div>
  );
}
