"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Avatar } from "@/components/ds/avatar";
import { Button } from "@/components/ds/button";
import { StatusPage } from "@/components/ds/empty-state";
import { focalToObjectPosition } from "@/components/ds/game-card";
import { Illustration } from "@/components/ds/illustration";
import { Skeleton } from "@/components/ds/skeleton";
import { focusRing } from "@/components/ds/styles";
import {
  IconCalendar,
  IconChevronDown,
  IconClock,
  IconHeart,
  IconLineGraph,
  IconPlay,
  IconTrophy,
  IconUsers,
} from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { canOpenFeature, useFeature } from "@/lib/features";
import { formatCompact, formatNumber, gamePath } from "@/lib/format";
import { canOptimizeImage } from "@/lib/optimize-image";
import { periodScore, type PlayRange } from "@/lib/popularity";
import { useGames, withInitialGames } from "@/lib/store";
import type { Game } from "@/lib/types";
import s from "./rankings.module.css";

/** Ranks 1–50. The podium holds the first three; the list shows the rest in pages. */
const MAX_RANK = 50;
const PAGE = 20;

const RANGES: Array<{ value: PlayRange; label: string; icon: typeof IconTrophy; note: string }> = [
  { value: "all", label: "All time", icon: IconTrophy, note: "Ranked by plays · All time" },
  { value: "day", label: "Today", icon: IconCalendar, note: "Trending today" },
  { value: "week", label: "This week", icon: IconClock, note: "Trending this week" },
];

const MEDAL = {
  1: { badge: "bg-linear-to-b from-pw-gold-soft to-pw-gold text-pw-gold-ink", line: "border-pw-gold", ink: "text-pw-gold" },
  2: { badge: "bg-pw-mist-100 text-pw-navy", line: "border-pw-mist-100", ink: "text-pw-mist-100" },
  3: { badge: "bg-pw-orange-hot text-pw-gold-ink", line: "border-pw-orange-hot", ink: "text-pw-orange-hot" },
} as const;

type Rank = 1 | 2 | 3;

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function playHref(game: Game) {
  const href = gamePath(game);
  return game.embeddable && game.playUrl ? `${href}?play=1` : href;
}

// ---------- page ----------

export function RankingsView({ initialGames }: { initialGames: Game[] }) {
  const { user, loading: authLoading } = useAuth();
  const { feature, loading: featureLoading } = useFeature("top");

  if (authLoading || featureLoading) return <RankingsSkeleton />;
  if (!canOpenFeature(feature ?? undefined, user?.email)) {
    return (
      <div className="pt-24">
        <StatusPage
          status="coming-soon"
          title="Rankings are coming soon"
          actions={
            <Button variant="primary" asChild>
              <Link href="/">Back to games</Link>
            </Button>
          }
        />
      </div>
    );
  }
  return <Rankings initialGames={initialGames} />;
}

function Rankings({ initialGames }: { initialGames: Game[] }) {
  const store = useGames();
  const [range, setRange] = useState<PlayRange>("all");
  const [shown, setShown] = useState(PAGE);

  const ranked = useMemo(() => {
    const games = withInitialGames(store.games, initialGames).filter((g) => g.playCount > 0);
    return games.sort((a, b) => periodScore(b, range) - periodScore(a, range)).slice(0, MAX_RANK);
  }, [store.games, initialGames, range]);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const visible = rest.slice(0, shown);
  const note = RANGES.find((r) => r.value === range)!.note;

  return (
    <div>
      {/* The stage stays night-dark in both themes, like the homepage hero over art. */}
      <div
        className="dark relative isolate overflow-hidden bg-pw-bg text-pw-text"
        style={{
          backgroundImage:
            "radial-gradient(55% 80% at 50% 0%, color-mix(in srgb, var(--pw-deep) 45%, transparent), transparent 70%), radial-gradient(25% 40% at 50% 55%, color-mix(in srgb, var(--pw-gold) 10%, transparent), transparent 70%)",
        }}
      >
        <Hero range={range} onRange={(r) => (setRange(r), setShown(PAGE))} />
        {podium.length ? (
          <Podium key={range} games={podium} />
        ) : (
          <Empty range={range} onAllTime={() => setRange("all")} />
        )}
      </div>

      {rest.length ? (
        <section aria-labelledby="climbing-title" className="mx-auto w-full max-w-[880px] px-4 pt-14 pb-20 md:px-0">
          <header className="flex flex-wrap items-end justify-between gap-3 px-1 pb-3">
            <div>
              <p className="font-pw-pixel text-pw-label tracking-[0.06em] text-pw-highlight-ink uppercase">
                Ranks 4 – {3 + rest.length}
              </p>
              <h2
                id="climbing-title"
                className="mt-1.5 font-pw-display text-[34px] leading-none font-extrabold text-pw-text uppercase italic"
              >
                Still climbing
              </h2>
            </div>
            <p className="flex items-center gap-1.5 text-pw-body-sm text-pw-muted">
              <IconLineGraph aria-hidden className="size-4" />
              {note}
            </p>
          </header>
          <ol key={range} className="flex flex-col gap-3">
            {visible.map((game, i) => (
              <li key={game.id} className={s.rise} style={delay(Math.min(i % PAGE, 12) * 35)}>
                <RankedRow game={game} rank={i + 4} />
              </li>
            ))}
          </ol>
          {rest.length > shown ? (
            <LoadMore shown={shown + 3} total={ranked.length} onMore={() => setShown((n) => n + PAGE)} />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

// ---------- hero ----------

function Hero({ range, onRange }: { range: PlayRange; onRange: (r: PlayRange) => void }) {
  return (
    <header className="relative z-10 flex flex-col items-center gap-3.5 px-4 pt-[104px] pb-6 text-center md:pt-[116px]">
      <p className={cn("font-pw-pixel text-pw-label tracking-[0.06em] text-pw-gold uppercase", s.rise)}>Leaderboard</p>
      <h1
        className={cn(
          "font-pw-display text-[clamp(52px,6vw,72px)] leading-[0.95] font-extrabold uppercase italic",
          s.title,
          s.rise,
        )}
        style={delay(60)}
      >
        Top played
      </h1>
      <p className={cn("text-[17px] text-pw-text-soft", s.rise)} style={delay(120)}>
        The games players can&rsquo;t put down.
      </p>
      <div className={cn("pt-3", s.rise)} style={delay(180)}>
        <PeriodSwitch value={range} onChange={onRange} />
      </div>
    </header>
  );
}

function PeriodSwitch({ value, onChange }: { value: PlayRange; onChange: (r: PlayRange) => void }) {
  return (
    <div
      role="group"
      aria-label="Ranking period"
      className="flex gap-1 rounded-pw-pill border border-[color-mix(in_srgb,var(--pw-sky)_20%,transparent)] bg-[color-mix(in_srgb,var(--pw-night-800)_80%,transparent)] p-1 backdrop-blur-md"
    >
      {RANGES.map(({ value: v, label, icon: Icon }) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-pw-pill pr-4 pl-3.5 text-[14px] transition-colors duration-150 sm:h-10",
              on
                ? "bg-linear-to-b from-pw-primary-hi to-pw-primary-lo font-bold text-pw-on-primary shadow-[inset_0_1px_0_color-mix(in_srgb,var(--pw-white)_35%,transparent),var(--pw-shadow-glow)]"
                : "font-semibold text-pw-text-soft hover:text-pw-text",
              focusRing,
            )}
          >
            <Icon aria-hidden className={cn("size-4", on ? "text-pw-on-primary" : "text-pw-muted")} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- podium ----------

function Podium({ games }: { games: Game[] }) {
  const [first, second, third] = games;
  return (
    <section aria-label="Top three" className="relative px-4 pt-6">
      <ol className="mx-auto grid max-w-[896px] grid-cols-2 items-end gap-x-3 gap-y-8 md:flex md:justify-center md:gap-7">
        {first ? (
          <Place game={first} rank={1} className="col-span-2 mx-auto w-full max-w-[340px] md:order-2 md:w-[320px] md:max-w-none" />
        ) : null}
        {second ? <Place game={second} rank={2} className="md:order-1 md:w-[260px]" /> : null}
        {third ? <Place game={third} rank={3} className="md:order-3 md:w-[260px]" /> : null}
      </ol>
    </section>
  );
}

const PLINTH = { 1: "h-[88px] md:h-[120px]", 2: "h-[68px] md:h-[100px]", 3: "h-[56px] md:h-[84px]" } as const;
const ENTER = { 1: 80, 2: 180, 3: 260 } as const;

function Place({ game, rank, className }: { game: Game; rank: Rank; className?: string }) {
  return (
    <li className={cn("flex min-w-0 flex-col gap-4", s.place, className)} style={delay(ENTER[rank])}>
      <PodiumCard game={game} rank={rank} />
      <div
        className={cn(
          "flex items-center justify-center rounded-t-[14px] border-t-2 bg-linear-to-b from-pw-surface-3 via-pw-surface-1 via-55% to-transparent",
          MEDAL[rank].line,
          PLINTH[rank],
          s.plinth,
        )}
        style={delay(ENTER[rank])}
      >
        <span className={s.laurel} style={delay(ENTER[rank])}>
          <Laurel rank={rank} />
        </span>
      </div>
    </li>
  );
}

function coverArt(game: Game) {
  const portrait = Boolean(game.portraitUrl);
  return {
    src: game.portraitUrl || game.thumbnailUrl,
    position: portrait
      ? "50% 50%"
      : focalToObjectPosition(
          game.focalX !== undefined && game.focalY !== undefined ? { x: game.focalX, y: game.focalY } : null,
        ),
  };
}

function PodiumCard({ game, rank }: { game: Game; rank: Rank }) {
  const big = rank === 1;
  const { src: cover, position } = coverArt(game);

  return (
    <article
      className={cn(
        "group relative isolate flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-[22px] border",
        "transition-[translate] duration-300 ease-pw-out hover:-translate-y-1.5 motion-reduce:hover:translate-y-0",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-pw-focus-ring",
        big
          ? cn("border-pw-gold/70 p-3.5 md:p-[18px]", s.crown)
          : "border-[color-mix(in_srgb,var(--pw-sky)_20%,transparent)] p-3 shadow-pw-3 md:p-3.5",
      )}
    >
      {cover ? (
        <CoverImage src={cover} position={position} priority={big} sizes={big ? "320px" : "(min-width: 768px) 260px, 46vw"} />
      ) : (
        <div aria-hidden className="absolute inset-0 -z-10 grid place-items-center bg-linear-to-br from-pw-deep to-pw-navy">
          <span className="font-pw-display text-[96px] font-extrabold text-[color-mix(in_srgb,var(--pw-sky)_35%,transparent)] uppercase italic">
            {game.title.trim().slice(0, 2) || "PW"}
          </span>
        </div>
      )}
      {/* Darken the top for the badges and the bottom for the title. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--pw-night-950)_40%,transparent)_0%,transparent_22%,transparent_42%,color-mix(in_srgb,var(--pw-night-950)_85%,transparent)_72%,color-mix(in_srgb,var(--pw-night-950)_97%,transparent)_100%)]"
      />
      <span aria-hidden className={cn(s.shimmer, s[`glint${rank}`])} />

      <div className="relative z-[3] flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-pw-pill pr-3 pl-2.5 font-pw-display text-[20px] font-extrabold italic shadow-[inset_0_1px_0_color-mix(in_srgb,var(--pw-white)_60%,transparent)]",
            MEDAL[rank].badge,
          )}
        >
          <IconTrophy aria-hidden className="size-4" />
          <span className="sr-only">Rank </span>#{rank}
        </span>
        {game.embeddable ? (
          <span
            className={cn(
              "h-[26px] items-center gap-1.5 rounded-pw-pill bg-[color-mix(in_srgb,var(--pw-night-950)_70%,transparent)] px-2.5 text-[11.5px] font-semibold whitespace-nowrap text-pw-on-art backdrop-blur-sm",
              big ? "inline-flex" : "hidden md:inline-flex",
            )}
          >
            <span aria-hidden className="size-1.5 rounded-full bg-pw-success" />
            Instant play
          </span>
        ) : null}
      </div>

      <div className="relative z-[3] flex flex-col gap-2.5 text-pw-on-art">
        <h3
          className={cn(
            "line-clamp-2 font-pw-display leading-[0.95] font-extrabold uppercase italic [overflow-wrap:anywhere]",
            big ? cn("text-[clamp(30px,4vw,40px)]", s.goldText) : "text-[clamp(20px,2.6vw,32px)] drop-shadow-[0_2px_0_var(--pw-deep)]",
          )}
        >
          {game.title}
        </h3>
        <p className="flex min-w-0 items-center gap-2 text-[13.5px] font-semibold text-pw-on-art-soft">
          <Avatar name={game.developer} src={game.creatorAvatarUrl} size="xs" ring />
          <span className="truncate">{game.developer}</span>
        </p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Stats game={game} className={cn("text-[13.5px] font-bold text-pw-on-art", big ? "inline-flex" : "hidden md:inline-flex")} />
          <Link
            href={playHref(game)}
            aria-label={`Play ${game.title}`}
            className={cn(
              "relative z-[4] grid shrink-0 place-items-center rounded-full bg-linear-to-b from-pw-primary-hi to-pw-primary-lo text-pw-on-primary shadow-pw-glow transition-transform duration-150 hover:scale-105",
              big ? "size-14" : "size-11",
              focusRing,
            )}
          >
            <IconPlay aria-hidden className={big ? "ml-0.5 size-5" : "ml-0.5 size-4"} />
          </Link>
        </div>
      </div>
      <Link href={gamePath(game)} aria-label={game.title} className="absolute inset-0 z-[3] rounded-[inherit] outline-none" />
    </article>
  );
}

function CoverImage({ src, position, priority, sizes }: { src: string; position: string; priority?: boolean; sizes: string }) {
  const cls =
    "absolute inset-0 -z-20 size-full object-cover transition-transform duration-500 ease-pw-out group-hover:scale-[1.04] motion-reduce:transition-none";
  if (canOptimizeImage(src)) {
    return <Image src={src} alt="" fill sizes={sizes} preload={priority} className={cls} style={{ objectPosition: position }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading={priority ? "eager" : "lazy"} decoding="async" className={cls} style={{ objectPosition: position }} />;
}

/** Laurel wreath for the plinth: leaves along two arcs in the medal colour, rank numeral inside. */
function Laurel({ rank }: { rank: Rank }) {
  // Two branches rise from the bottom of the wreath and curl up the sides, leaves tilted outward.
  const leaves: ReactNode[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const deg = side < 0 ? 104 + i * 22 : 76 - i * 22;
      const a = (deg * Math.PI) / 180;
      const x = 36 + Math.cos(a) * 25;
      const y = 37 + Math.sin(a) * 25;
      const rot = deg + 90 + side * 28;
      const size = 1 - i * 0.08;
      leaves.push(
        <ellipse key={`${side}-${i}`} cx={x} cy={y} rx={8 * size} ry={3.6 * size} transform={`rotate(${rot} ${x} ${y})`} />,
      );
    }
  }
  const suffix = rank === 1 ? "st" : rank === 2 ? "nd" : "rd";
  return (
    <span className={cn("relative grid size-[60px] place-items-center md:size-[72px]", MEDAL[rank].ink)}>
      <svg viewBox="0 0 72 72" aria-hidden className="absolute inset-0 size-full fill-current opacity-90">
        {leaves}
      </svg>
      <span className="relative flex items-start gap-0.5 pr-1 font-pw-display font-extrabold italic">
        <span className="text-[24px] leading-none md:text-[28px]">{rank}</span>
        <span className="text-[10px] leading-none uppercase md:text-[11px]">{suffix}</span>
      </span>
    </span>
  );
}

// ---------- list ----------

/** Plays and likes. Callers set the display (inline-flex / hidden): cn doesn't merge conflicting classes. */
function Stats({ game, className }: { game: Game; className: string }) {
  return (
    <span className={cn("items-center gap-3.5 tabular-nums", className)}>
      <span className="inline-flex items-center gap-1.5" title={`${formatNumber(game.playCount)} plays`}>
        <IconUsers aria-hidden className="size-4 opacity-80" />
        <span className="sr-only">Plays:</span>
        {formatCompact(game.playCount)}
      </span>
      <span className="inline-flex items-center gap-1.5" title={`${formatNumber(game.likeCount)} likes`}>
        <IconHeart aria-hidden className="size-4 text-pw-gold" />
        <span className="sr-only">Likes:</span>
        {formatCompact(game.likeCount)}
      </span>
    </span>
  );
}

function RankedRow({ game, rank }: { game: Game; rank: number }) {
  const cover = coverArt(game);
  return (
    <article
      className={cn(
        "group relative grid grid-cols-[34px_48px_minmax(0,1fr)_auto] items-center gap-3 rounded-pw-lg border border-pw-line bg-pw-surface-1 py-2.5 pr-3 pl-2.5 sm:grid-cols-[44px_64px_minmax(0,1fr)_auto_auto] sm:gap-[18px] sm:py-3 sm:pr-3.5 sm:pl-3",
        "transition-[background-color,border-color,box-shadow,translate] duration-200 ease-pw-out",
        "hover:-translate-y-px hover:border-pw-line-strong hover:bg-pw-surface-3 hover:shadow-pw-2 motion-reduce:hover:translate-y-0",
        "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-pw-focus-ring",
      )}
    >
      <span className="text-center font-pw-display text-[24px] font-extrabold text-pw-muted tabular-nums italic sm:text-[30px]">
        <span className="sr-only">Rank </span>
        {rank}
      </span>
      <div className="relative isolate aspect-[3/4] overflow-hidden rounded-[10px] border border-pw-line bg-pw-surface-3">
        {cover.src ? (
          <CoverImage src={cover.src} position={cover.position} sizes="64px" />
        ) : (
          <span aria-hidden className="grid size-full place-items-center bg-linear-to-br from-pw-deep to-pw-navy font-pw-display text-[22px] font-extrabold text-pw-sky uppercase italic">
            {game.title.trim().slice(0, 2)}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-bold text-pw-text sm:text-[16px]" title={game.title}>
          {game.title}
        </h3>
        <p className="mt-1 flex min-w-0 items-center gap-2 text-[13.5px] text-pw-text-soft">
          <Avatar name={game.developer} src={game.creatorAvatarUrl} size="xs" />
          <span className="truncate">{game.developer}</span>
        </p>
        <Stats game={game} className="mt-1.5 inline-flex text-[12.5px] font-bold text-pw-text sm:hidden" />
      </div>
      <Stats game={game} className="hidden text-[13.5px] font-bold text-pw-text sm:inline-flex" />
      <Button variant="primary" size="sm" asChild className="relative z-[2] max-sm:size-11 max-sm:px-0">
        <Link href={playHref(game)} aria-label={`Play ${game.title}`}>
          <IconPlay aria-hidden />
          <span className="max-sm:sr-only">Play</span>
        </Link>
      </Button>
      <Link href={gamePath(game)} aria-label={game.title} className="absolute inset-0 z-[1] rounded-[inherit] outline-none" />
    </article>
  );
}

function LoadMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  const pct = Math.round((Math.min(shown, total) / Math.max(total, 1)) * 100);
  return (
    <div className="flex flex-col items-center gap-3.5 pt-7">
      <div
        role="progressbar"
        aria-label="Games shown"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1 w-[200px] overflow-hidden rounded-full bg-pw-surface-3"
      >
        <div className="h-full rounded-full bg-pw-primary transition-[width] duration-300 ease-pw-out" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-pw-body-sm text-pw-muted tabular-nums">
        Showing {formatNumber(Math.min(shown, total))} of {formatNumber(total)} games
      </p>
      <Button onClick={onMore}>
        Load more
        <IconChevronDown aria-hidden className="size-3.5" />
      </Button>
    </div>
  );
}

// ---------- states ----------

function Empty({ range, onAllTime }: { range: PlayRange; onAllTime: () => void }) {
  const when = range === "day" ? "today" : range === "week" ? "this week" : "yet";
  return (
    <section className="flex flex-col items-center gap-5 px-4 pt-6 pb-24 text-center">
      <Illustration name="nothing-played" size="m" />
      <div className="flex flex-col gap-1.5">
        <h2 className="font-pw-display text-[32px] leading-none font-extrabold text-pw-text uppercase italic">
          No games played {when}
        </h2>
        <p className="text-pw-body text-pw-muted">Plays show up here as soon as people start playing.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {range !== "all" ? (
          <Button variant="primary" onClick={onAllTime}>
            See all-time rankings
          </Button>
        ) : null}
        <Button asChild variant={range === "all" ? "primary" : "secondary"}>
          <Link href="/">Browse games</Link>
        </Button>
      </div>
    </section>
  );
}

/** Same footprint as the page: hero, three podium cards, rows. Also used by loading.tsx. */
export function RankingsSkeleton() {
  return (
    <div role="status" aria-label="Loading rankings" aria-busy="true" className="dark bg-pw-bg pb-16">
      <div className="flex flex-col items-center gap-4 px-4 pt-[116px] pb-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-16 w-72 rounded-pw-lg" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="mt-3 h-12 w-[337px] max-w-full rounded-pw-pill" />
      </div>
      <div className="mx-auto grid max-w-[896px] grid-cols-2 items-end gap-3 px-4 md:flex md:justify-center md:gap-7">
        <Skeleton className="col-span-2 mx-auto aspect-[3/4] w-full max-w-[340px] rounded-[22px] md:order-2 md:w-[320px]" />
        <Skeleton className="aspect-[3/4] rounded-[22px] md:order-1 md:w-[260px]" />
        <Skeleton className="aspect-[3/4] rounded-[22px] md:order-3 md:w-[260px]" />
      </div>
      <div className="mx-auto mt-14 flex max-w-[880px] flex-col gap-3 px-4 md:px-0">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[87px] rounded-pw-lg" />
        ))}
      </div>
    </div>
  );
}
