"use client";

import { IconBook, IconClose, IconFlame, IconHeart, IconHistory, IconKeyboard, IconPhone, IconSearch, IconSliders, IconSpark, IconUsers } from "@/components/icons";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ds/button";
import { EmptyState } from "@/components/ds/empty-state";
import { CreatorCTA, GuestBanner } from "@/components/home/Banners";
import { TallCard, WideCard } from "@/components/home/cards";
import { NewestGamesSection } from "@/components/home/NewestGamesSection";
import { FilterRail } from "@/components/home/FilterRail";
import {
  CREATOR_COLORS,
  VIEW_TITLES,
  byPopularity,
  capitalize,
  creatorsOf,
  filtersHref,
  isBrowsing,
  matchesFilters,
  parseFilters,
  shelfTag,
  toggle,
  viewGames,
  type Creator,
  type HomeFilters,
} from "@/components/home/filters";
import { Hero } from "@/components/home/Hero";
import s from "@/components/home/home.module.css";
import { HomeUiProvider } from "@/components/home/Peek";
import { Arrows, Row, SectionHead, SeeAll, useScroller } from "@/components/home/Section";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPlays, initials } from "@/lib/format";
import { catalogueTags, useGames, withInitialGames } from "@/lib/store";
import { pickFeaturedGames } from "@/lib/featured-games";
import { useHomePickIds } from "@/lib/home-picks.client";
import { pickHeroGames } from "@/lib/hero-spotlights";
import type { Game } from "@/lib/types";
import { replaceHomeUrl, revealCatalogue } from "@/components/home/HomeLink";
import { useTouchDevice } from "@/components/home/useTouchDevice";
import { DEVICE_LABEL, playsOnPhone, type Device } from "@/lib/device";

/** Below this many games the page uses the compact sparse layout. */
const SPARSE_LIMIT = 8;

export function HomeView({
  initialGames,
  heroSpotlightIds = [],
  featuredGameIds = [],
  weeklyPlays = {},
}: {
  initialGames: Game[];
  heroSpotlightIds?: string[];
  featuredGameIds?: string[];
  weeklyPlays?: Record<string, number>;
}) {
  const store = useGames();
  const { user, loading } = useAuth();
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const [filterSheet, setFilterSheet] = useState(false);

  useEffect(() => {
    if (!filterSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterSheet]);

  const allGames = useMemo(() => withInitialGames(store.games, initialGames), [store.games, initialGames]);
  // Phone and Desktop (#38) are filters like Category: picking one shows the matching games as
  // results, and the hero and rows keep every game (#47).
  // Until some game has its controls set (before the controls migration runs), there is nothing to
  // filter on: the chips stay hidden and the catalogue shows in full.
  const games = allGames;
  const hasControls = useMemo(() => allGames.some((g) => (g.controls?.length ?? 0) > 0), [allGames]);
  const device = hasControls ? filters.device : null;
  const panelFilters = useMemo(() => (hasControls ? filters : { ...filters, device: null }), [filters, hasControls]);
  // On phones, a row of games that play there, near the top (#47).
  const touch = useTouchDevice();
  const phoneGames = useMemo(
    () => (touch && hasControls ? byPopularity(allGames.filter((g) => playsOnPhone(g.controls))) : []),
    [allGames, hasControls, touch],
  );
  // Curated games (#9) get their own "Curated picks" row (after featured, before hottest this week).
  const own = useMemo(() => games.filter((g) => !g.curated), [games]);
  const curated = useMemo(() => byPopularity(games.filter((g) => g.curated)), [games]);
  const tags = useMemo(() => catalogueTags(games), [games]);
  const creators = useMemo(() => creatorsOf(own), [own]);
  const popular = useMemo(() => byPopularity(own), [own]);
  const { heroIds, featuredIds } = useHomePickIds(heroSpotlightIds, featuredGameIds);
  const heroGames = useMemo(() => pickHeroGames(heroIds, games), [heroIds, games]);
  const featuredGames = useMemo(() => pickFeaturedGames(featuredIds, games, heroIds), [featuredIds, heroIds, games]);
  const browsing = isBrowsing(panelFilters);
  const hasRail = hasControls || tags.length > 0 || creators.length > 0;
  const filterCount = filters.tags.length + filters.creators.length + (filters.view ? 1 : 0) + (device ? 1 : 0);

  // Filters change the address through the history API, not the router: the games are already here,
  // so there is nothing to ask the server for (#45). See components/home/HomeLink.tsx.
  // Results replace the rows, so the page moves to the top of them.
  const go = useCallback(
    (next: Partial<HomeFilters>) => {
      replaceHomeUrl(filtersHref({ ...filters, ...next }));
      revealCatalogue();
    },
    [filters],
  );
  const reset = useCallback(() => replaceHomeUrl("/"), []);

  // Phone and Desktop are only ever picked by the person (#47): nothing turns on by itself.
  const pickDevice = useCallback((device: Device | null) => go({ device }), [go]);

  const ctx = { library: store.library, history: store.history, weeklyPlays };
  const results = browsing
    ? (filters.view === "featured" ? featuredGames : viewGames(filters.view, games, ctx)).filter((g) =>
        matchesFilters(g, panelFilters),
      )
    : [];
  const showRecentRow = filters.view === "recent" && !browsing;
  const recentRowGames = useMemo(() => {
    if (!showRecentRow) return [];
    const panel = { ...panelFilters, view: null };
    return viewGames("recent", games, ctx).filter((g) => matchesFilters(g, panel));
  }, [showRecentRow, games, ctx, filters]);

  const recent = useMemo(() => {
    const byId = new Map(games.map((g) => [g.id, g]));
    return store.history.flatMap((h) => {
      const game = byId.get(h.id);
      return game ? [{ game, at: h.at }] : [];
    });
  }, [games, store.history]);

  return (
    <HomeUiProvider>
      <Hero games={heroGames} />
      <div className={s.frame}>
        <div className={cn(s.wrap, s.layout, !hasRail && s.layoutNoRail)}>
          {hasRail ? (
            <FilterRail
              filters={filters}
              tags={tags}
              creators={creators}
              device={hasControls ? device : undefined}
              onDevice={pickDevice}
              onChange={go}
              onReset={reset}
            />
          ) : null}
          <div className={s.main} data-catalogue>
            {hasRail ? (
              <button
                type="button"
                className={cn(s.btn, s.btnSoft, s.mobileFilter)}
                onClick={() => setFilterSheet(true)}
                aria-label="Open filters"
              >
                <IconSliders className={cn(s.ic, s.sm)} />
                Filters
                {filterCount > 0 ? <b className={s.tnum}>{filterCount}</b> : null}
              </button>
            ) : null}
            {browsing ? (
              <Results games={results} filters={panelFilters} creators={creators} onChange={go} onReset={reset} />
            ) : (
              <>
                {showRecentRow ? <RecentRow games={recentRowGames} /> : null}
                {own.length < SPARSE_LIMIT ? (
                  <Sparse
                    catalogue={games}
                    featured={featuredGames}
                    phone={phoneGames}
                    popular={popular}
                    curated={curated}
                    signedIn={Boolean(user)}
                    recent={recent}
                    authReady={!loading}
                  />
                ) : (
                  <Full
                    games={own}
                    catalogue={games}
                    featured={featuredGames}
                    phone={phoneGames}
                    popular={popular}
                    curated={curated}
                    tags={tags}
                    creators={creators}
                    filters={filters}
                    onChange={go}
                    recent={recent}
                    showGuestBanner={!loading && !user}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {filterSheet ? (
        <>
          <div className={s.scrim} onClick={() => setFilterSheet(false)} aria-hidden />
          <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Filters">
            <div className={s.grab} />
            <div className={s.sheetBody}>
              <FilterRail
                filters={filters}
                tags={tags}
                creators={creators}
                device={hasControls ? device : undefined}
                onDevice={pickDevice}
                onChange={go}
                onReset={reset}
              />
            </div>
            <div className={s.sheetFoot}>
              <button
                type="button"
                className={cn(s.btn, s.btnGhost)}
                onClick={() => go({ tags: [], creators: [], device: null })}
              >
                Reset
              </button>
              <button type="button" className={cn(s.btn, s.btnPrimary)} onClick={() => setFilterSheet(false)}>
                Show {viewGames(filters.view, games, ctx).filter((g) => matchesFilters(g, panelFilters)).length} games
              </button>
            </div>
          </div>
        </>
      ) : null}
    </HomeUiProvider>
  );
}

function FeaturedRow({ games }: { games: Game[] }) {
  if (games.length === 0) return null;
  return (
    <Row icon={IconSpark} title="Featured games" href="/?view=featured" kind="tall" sideArrows>
      {games.map((g, i) => (
        <TallCard key={g.id} game={g} i={i} priority={i < 3} />
      ))}
    </Row>
  );
}

/** Phones only: games that play there, so nobody has to go looking (#47). */
function PhoneRow({ games }: { games: Game[] }) {
  if (games.length === 0) return null;
  return (
    <Row icon={IconPhone} title="Plays on your phone" href={filtersHref({ device: "phone" })} kind="tall">
      {games.slice(0, 12).map((g, i) => (
        <TallCard key={g.id} game={g} i={i} />
      ))}
    </Row>
  );
}

function RecentRow({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return (
      <section className={s.reveal}>
        <SectionHead icon={IconHistory} title="Recently played" />
        <EmptyState kind="user" title="Nothing here yet" body="Games you open will show up in this row." className={s.empty} />
      </section>
    );
  }
  return (
    <Row icon={IconHistory} title="Recently played" href={filtersHref({ view: "recent", browse: true })} kind="tall" sideArrows>
      {games.slice(0, 12).map((g, i) => (
        <TallCard key={g.id} game={g} i={i} priority={i < 3} />
      ))}
    </Row>
  );
}

function Full({
  games,
  catalogue,
  featured,
  phone,
  popular,
  curated,
  tags,
  creators,
  filters,
  onChange,
  recent,
  showGuestBanner,
}: {
  games: Game[];
  catalogue: Game[];
  featured: Game[];
  phone: Game[];
  popular: Game[];
  curated: Game[];
  tags: string[];
  creators: Creator[];
  filters: HomeFilters;
  onChange: (next: Partial<HomeFilters>) => void;
  recent: { game: Game; at: number }[];
  showGuestBanner: boolean;
}) {
  const tag = shelfTag(tags, games);
  const tagged = tag ? popular.filter((g) => g.tags.includes(tag)).slice(0, 6) : [];

  return (
    <>
      <FeaturedRow games={featured} />
      <PhoneRow games={phone} />
      {curated.length > 0 ? <CuratedPicks games={curated} /> : null}
      {showGuestBanner ? <GuestBanner recent={recent} popular={popular} /> : null}
      <NewestGamesSection games={catalogue} />
      {popular.length > 0 ? (
        <Row icon={IconFlame} title="Most played" href="/?view=popular" kind="tall">
          {popular.slice(0, 12).map((g, i) => (
            <TallCard key={g.id} game={g} i={i} badge={i < 2 ? "top" : null} />
          ))}
        </Row>
      ) : null}
      {tag && tagged.length > 0 ? (
        <Row icon={IconBook} title={`${capitalize(tag)} games`} href={filtersHref({ tags: [tag] })} kind="wide">
          {tagged.map((g, i) => (
            <WideCard key={g.id} game={g} i={i} />
          ))}
        </Row>
      ) : null}
      {creators.length > 0 ? (
        <Creators
          creators={creators.slice(0, 12)}
          selected={filters.creators}
          onPick={(handle) => onChange({ view: null, creators: toggle(filters.creators, handle) })}
        />
      ) : null}
    </>
  );
}

/** Games by other creators that PlayInWeb hosts with credit until they claim them (#9). */
function CuratedPicks({ games }: { games: Game[] }) {
  return (
    <Row icon={IconHeart} title="Curated picks" kind="tall">
      {games.slice(0, 12).map((g, i) => (
        <TallCard key={g.id} game={g} i={i} />
      ))}
    </Row>
  );
}

function Sparse({
  catalogue,
  featured,
  phone,
  popular,
  curated,
  signedIn,
  recent,
  authReady,
}: {
  catalogue: Game[];
  featured: Game[];
  phone: Game[];
  popular: Game[];
  curated: Game[];
  signedIn: boolean;
  recent: { game: Game; at: number }[];
  authReady: boolean;
}) {
  return (
    <>
      <FeaturedRow games={featured} />
      <PhoneRow games={phone} />
      {curated.length > 0 ? <CuratedPicks games={curated} /> : null}
      {authReady && !signedIn ? <GuestBanner recent={recent} popular={popular} /> : null}
      {signedIn ? <CreatorCTA games={popular} /> : null}
      <NewestGamesSection games={catalogue} publishSlot />
    </>
  );
}

function Creators({
  creators,
  selected,
  onPick,
}: {
  creators: Creator[];
  selected: string[];
  onPick: (handle: string) => void;
}) {
  const { ref, edge, go } = useScroller();
  const scrollable = !(edge.l && edge.r);
  return (
    <section id="creators" className={cn(s.creators, s.revealSelf)}>
      <SectionHead icon={IconUsers} title="Popular creators" tools={scrollable ? <Arrows edge={edge} go={go} /> : null} />
      <div className={s.chips} ref={ref}>
        {creators.map((c, i) => (
          <button key={c.handle} type="button" className={s.chip} aria-pressed={selected.includes(c.handle)} onClick={() => onPick(c.handle)}>
            <span className={s.ini} style={{ background: CREATOR_COLORS[i % CREATOR_COLORS.length] }}>
              {c.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatarUrl} alt="" />
              ) : (
                initials(c.name)
              )}
            </span>
            <span>
              <b>{c.name}</b>
              <small className={s.tnum}>
                {c.games} {c.games === 1 ? "game" : "games"} · {formatPlays(c.plays)} plays
              </small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Results({
  games,
  filters,
  creators,
  onChange,
  onReset,
}: {
  games: Game[];
  filters: HomeFilters;
  creators: Creator[];
  onChange: (next: Partial<HomeFilters>) => void;
  onReset: () => void;
}) {
  const { q, view, device } = filters;
  const onlyDevice = Boolean(device) && !q.trim() && !view && !filters.tags.length && !filters.creators.length;
  const name = (handle: string) => creators.find((c) => c.handle === handle)?.name ?? handle;
  const title = q.trim()
    ? `Results for “${q.trim()}”`
    : view
      ? VIEW_TITLES[view]
      : onlyDevice && device
        ? `Plays on ${DEVICE_LABEL[device].toLowerCase()}`
        : filters.tags.length === 1 && !filters.creators.length
          ? capitalize(filters.tags[0])
          : "Filtered games";

  const chips = [
    ...filters.tags.map((t) => ({ key: `t:${t}`, label: capitalize(t), remove: () => onChange({ tags: filters.tags.filter((x) => x !== t) }) })),
    ...filters.creators.map((c) => ({
      key: `c:${c}`,
      label: name(c),
      remove: () => onChange({ creators: filters.creators.filter((x) => x !== c) }),
    })),
    ...(q.trim() ? [{ key: "q", label: `“${q.trim()}”`, remove: () => onChange({ q: "" }) }] : []),
    ...(device && !onlyDevice ? [{ key: "d", label: DEVICE_LABEL[device], remove: () => onChange({ device: null }) }] : []),
  ];

  const empty =
    view === "saved"
      ? {
          kind: "user" as const,
          illustration: "no-favorites" as const,
          title: "No favorites yet",
          body: "Press Save on a game you like and it shows up here.",
        }
      : view === "recent"
        ? {
            kind: "user" as const,
            illustration: "nothing-played" as const,
            title: "Nothing played yet",
            body: "Games you open show up here.",
          }
        : onlyDevice && device
          ? {
              kind: "no-results" as const,
              illustration: "no-results" as const,
              title: `No ${DEVICE_LABEL[device].toLowerCase()} games yet`,
              body: "We're still checking which games play on which device.",
            }
          : {
              kind: "no-results" as const,
              illustration: "no-results" as const,
              title: "No games match",
              body: "Try removing a few filters or searching for something else.",
            };

  return (
    <section aria-live="polite">
      <SectionHead
        icon={
          view === "saved"
            ? IconHeart
            : view === "recent"
              ? IconHistory
              : onlyDevice
                ? device === "phone"
                  ? IconPhone
                  : IconKeyboard
                : IconSearch
        }
        title={title}
        count={games.length}
        tools={<SeeAll href="/" label="Back to home" />}
      />
      {chips.length > 0 ? (
        <div className={s.fchips}>
          {chips.map((c) => (
            <button key={c.key} type="button" className={s.fchip} onClick={c.remove} aria-label={`Remove ${c.label}`}>
              {c.label}
              <IconClose className={cn(s.ic, s.xs)} />
            </button>
          ))}
        </div>
      ) : null}
      {games.length > 0 ? (
        <div className={s.grid}>
          {games.map((g, i) => (
            <TallCard key={g.id} game={g} i={i} reveal={false} priority={i < 6} />
          ))}
        </div>
      ) : (
        <EmptyState
          kind={empty.kind}
          illustration={empty.illustration}
          title={empty.title}
          body={empty.body}
          action={
            <Button variant="primary" type="button" onClick={onReset}>
              Clear all filters
            </Button>
          }
        />
      )}
    </section>
  );
}
