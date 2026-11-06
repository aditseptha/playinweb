"use client";

import { BookOpen, Flame, Heart, History, Rocket, Search, Sparkles, Users, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { CreatorCTA, GuestBanner } from "@/components/home/Banners";
import { FeatureCard, SlotCard, TallCard, WideCard } from "@/components/home/cards";
import { FilterRail } from "@/components/home/FilterRail";
import {
  CREATOR_COLORS,
  VIEW_TITLES,
  byNewest,
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
import { TabBar } from "@/components/home/TabBar";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPlays, initials } from "@/lib/format";
import { catalogueTags, useGames, withInitialGames } from "@/lib/store";
import type { Game } from "@/lib/types";

/** Below this many games the page uses the compact layout ("From the community" + slot card). */
const SPARSE_LIMIT = 8;

export function HomeView({ initialGames }: { initialGames: Game[] }) {
  const store = useGames();
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const [filterSheet, setFilterSheet] = useState(false);

  const games = useMemo(() => withInitialGames(store.games, initialGames), [store.games, initialGames]);
  const tags = useMemo(() => catalogueTags(games), [games]);
  const creators = useMemo(() => creatorsOf(games), [games]);
  const popular = useMemo(() => byPopularity(games), [games]);
  const browsing = isBrowsing(filters);
  const hasRail = tags.length > 0 || creators.length > 0;
  const filterCount = filters.tags.length + filters.creators.length;

  const go = useCallback(
    (next: Partial<HomeFilters>) => router.replace(filtersHref({ ...filters, ...next }), { scroll: false }),
    [filters, router],
  );
  const reset = useCallback(() => router.replace("/", { scroll: false }), [router]);

  const ctx = { library: store.library, history: store.history };
  const results = browsing ? viewGames(filters.view, games, ctx).filter((g) => matchesFilters(g, filters)) : [];

  const recent = useMemo(() => {
    const byId = new Map(games.map((g) => [g.id, g]));
    return store.history.flatMap((h) => {
      const game = byId.get(h.id);
      return game ? [{ game, at: h.at }] : [];
    });
  }, [games, store.history]);

  return (
    <HomeUiProvider>
      <Hero game={popular[0] ?? null} />
      <div className={s.frame}>
        <div className={cn(s.wrap, s.layout, !hasRail && s.layoutNoRail)}>
          {hasRail ? <FilterRail filters={filters} tags={tags} creators={creators} onChange={go} onReset={reset} /> : null}
          <div className={s.main}>
            <TabBar
              filters={filters}
              tags={tags}
              filterCount={filterCount}
              onChange={go}
              onReset={reset}
              onOpenFilter={hasRail ? () => setFilterSheet(true) : undefined}
            />
            {browsing ? (
              <Results games={results} filters={filters} creators={creators} onChange={go} onReset={reset} />
            ) : (
              <>
                {!loading && !user ? <GuestBanner recent={recent} popular={popular} /> : null}
                {games.length < SPARSE_LIMIT ? (
                  <Sparse popular={popular} signedIn={Boolean(user)} />
                ) : (
                  <Full games={games} popular={popular} tags={tags} creators={creators} filters={filters} onChange={go} />
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
              <FilterRail filters={filters} tags={tags} creators={creators} onChange={go} onReset={reset} />
            </div>
            <div className={s.sheetFoot}>
              <button type="button" className={cn(s.btn, s.btnGhost)} onClick={() => go({ tags: [], creators: [] })}>
                Reset
              </button>
              <button type="button" className={cn(s.btn, s.btnPrimary)} onClick={() => setFilterSheet(false)}>
                Show {viewGames(filters.view, games, ctx).filter((g) => matchesFilters(g, filters)).length} games
              </button>
            </div>
          </div>
        </>
      ) : null}
    </HomeUiProvider>
  );
}

function Full({
  games,
  popular,
  tags,
  creators,
  filters,
  onChange,
}: {
  games: Game[];
  popular: Game[];
  tags: string[];
  creators: Creator[];
  filters: HomeFilters;
  onChange: (next: Partial<HomeFilters>) => void;
}) {
  const newest = byNewest(games).slice(0, 12);
  const tag = shelfTag(tags, games);
  const tagged = tag ? popular.filter((g) => g.tags.includes(tag)).slice(0, 6) : [];

  return (
    <>
      <Row icon={Sparkles} title="Featured games" href="/?view=featured" kind="wide" sideArrows>
        {popular.slice(0, 6).map((g, i) => (
          <FeatureCard key={g.id} game={g} i={i} priority={i < 3} />
        ))}
      </Row>
      <Row icon={Rocket} title="New releases" href="/?view=new" kind="tall">
        {newest.map((g, i) => (
          <TallCard key={g.id} game={g} i={i} />
        ))}
      </Row>
      <Row icon={Flame} title="Most played" href="/?view=popular" kind="tall">
        {popular.slice(0, 12).map((g, i) => (
          <TallCard key={g.id} game={g} i={i} badge={i < 2 ? "top" : null} />
        ))}
      </Row>
      {tag && tagged.length > 0 ? (
        <Row icon={BookOpen} title={`${capitalize(tag)} games`} href={filtersHref({ tags: [tag] })} kind="wide">
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

function Sparse({ popular, signedIn }: { popular: Game[]; signedIn: boolean }) {
  const featured = popular.slice(0, 3);
  const community = popular.slice(3);
  return (
    <>
      {featured.length > 0 ? (
        <Row icon={Sparkles} title="Featured games" kind="wide" sideArrows>
          {featured.map((g, i) => (
            <FeatureCard key={g.id} game={g} i={i} priority />
          ))}
        </Row>
      ) : null}
      <section id="creators" className={s.reveal}>
        <SectionHead icon={Rocket} title="From the community" />
        <div className={s.community}>
          {community.map((g, i) => (
            <TallCard key={g.id} game={g} i={i} />
          ))}
          <SlotCard slot={community.length + 1} />
        </div>
      </section>
      {signedIn ? <CreatorCTA games={popular} /> : null}
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
      <SectionHead icon={Users} title="Popular creators" tools={scrollable ? <Arrows edge={edge} go={go} /> : null} />
      <div className={s.chips} ref={ref}>
        {creators.map((c, i) => (
          <button key={c.handle} type="button" className={s.chip} aria-pressed={selected.includes(c.handle)} onClick={() => onPick(c.handle)}>
            <span className={s.ini} style={{ background: CREATOR_COLORS[i % CREATOR_COLORS.length] }}>
              {initials(c.name)}
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
  const { q, view } = filters;
  const name = (handle: string) => creators.find((c) => c.handle === handle)?.name ?? handle;
  const title = q.trim()
    ? `Results for “${q.trim()}”`
    : view
      ? VIEW_TITLES[view]
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
  ];

  const empty =
    view === "saved"
      ? { h: "No favorites yet", p: "Press Save on a game you like and it shows up here." }
      : view === "recent"
        ? { h: "Nothing played yet", p: "Games you open show up here." }
        : { h: "No games match", p: "Try removing a few filters or searching for something else." };

  return (
    <section aria-live="polite">
      <SectionHead
        icon={view === "saved" ? Heart : view === "recent" ? History : Search}
        title={title}
        count={games.length}
        tools={<SeeAll href="/" label="Back to home" />}
      />
      {chips.length > 0 ? (
        <div className={s.fchips}>
          {chips.map((c) => (
            <button key={c.key} type="button" className={s.fchip} onClick={c.remove} aria-label={`Remove ${c.label}`}>
              {c.label}
              <X className={cn(s.ic, s.xs)} />
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
        <div className={s.empty}>
          <h3>{empty.h}</h3>
          <p>{empty.p}</p>
          <button type="button" className={cn(s.btn, s.btnPrimary)} onClick={onReset}>
            Clear all filters
          </button>
        </div>
      )}
    </section>
  );
}
