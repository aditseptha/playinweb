"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { GameCard } from "@/components/GameCard";
import { GameThumb } from "@/components/GameThumb";
import { GameRail, Shelf } from "@/components/Shelf";
import { IconCalendar, IconCheck, IconClock, IconPlay, IconTrophy } from "@/components/icons";
import { Button, LinkButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { FeatureGate } from "@/components/FeatureGate";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPlays, gamePath } from "@/lib/format";
import { apexHref, parseSubdomain } from "@/lib/host";
import { maxPopularity } from "@/lib/popularity";
import { useGames } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { umamiShareUrl } from "@/lib/umami";
import type { Game } from "@/lib/types";

const BID_KEY = "showcase.bids.v2";
const BID_KEY_LEGACY = "showcase.bids.v1";

type Range = "all" | "today" | "week";
type Bid = { amount: number; at: number };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek() {
  return Date.now() - 7 * 86_400_000;
}

function readBids(): Record<string, Bid> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BID_KEY) ?? window.localStorage.getItem(BID_KEY_LEGACY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, Bid | number>) : {};
    const next: Record<string, Bid> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        next[id] = { amount: value, at: Date.now() };
      } else if (value && typeof value === "object" && Number.isFinite(value.amount) && value.amount >= 0) {
        next[id] = { amount: value.amount, at: Number.isFinite(value.at) ? value.at : Date.now() };
      }
    }
    return next;
  } catch {
    return {};
  }
}

function categoryOf(game: Game) {
  return game.tags[0] ? game.tags[0] : "Other";
}

function bidOf(game: Game, bids: Record<string, Bid>, range: Range) {
  const bid = bids[game.id];
  if (!bid) return game.promotionBoost ?? 0;
  if (range === "today" && bid.at < startOfToday()) return 0;
  if (range === "week" && bid.at < startOfWeek()) return 0;
  return bid.amount;
}

function resolveGame(input: string, games: Game[]): Game | null {
  const raw = input.trim();
  if (!raw) return null;
  const exactId = games.find((g) => g.id === raw);
  if (exactId) return exactId;

  const handleSlug = raw.match(/^@?([a-z0-9-]+)\/([a-z0-9-]+)$/i);
  if (handleSlug) {
    const handle = handleSlug[1].toLowerCase();
    const slug = handleSlug[2].toLowerCase();
    return games.find((g) => g.channelHandle === handle && g.projectSlug === slug) ?? null;
  }

  try {
    const url = new URL(raw.includes("://") ? raw : `http://${raw}`);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "game" && parts[1]) return games.find((g) => g.id === parts[1]) ?? null;
    if (parts[0] === "site" && parts[1] && parts[2]) {
      return games.find((g) => g.channelHandle === parts[1] && g.projectSlug === parts[2]) ?? null;
    }
    if (parts[0] && parts[1] && parts[0] !== "game") {
      const byPath = games.find((g) => g.channelHandle === parts[0] && g.projectSlug === parts[1]);
      if (byPath) return byPath;
    }
    const sub = parseSubdomain(url.host);
    if (sub && parts[0]) {
      return games.find((g) => g.channelHandle === sub && g.projectSlug === parts[0]) ?? null;
    }
  } catch {
    /* not a url */
  }

  const lower = raw.toLowerCase();
  return games.find((g) => g.title.toLowerCase() === lower) ?? null;
}

export default function ShowcasePage() {
  const { games } = useGames();
  const { user, loading } = useAuth();
  const [bids, setBids] = useState(readBids);
  const [filter, setFilter] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [url, setUrl] = useState("");
  const [amount, setAmount] = useState(1);
  const [notice, setNotice] = useState("");
  const max = maxPopularity(games);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const game of games) {
      const cat = categoryOf(game);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([name]) => name);
  }, [games]);

  const ranked = useMemo(() => {
    const pool = filter ? games.filter((g) => categoryOf(g) === filter) : games;
    return [...pool].sort((a, b) => {
      const bidGap = bidOf(b, bids, range) - bidOf(a, bids, range);
      if (bidGap !== 0) return bidGap;
      return b.playCount - a.playCount;
    });
  }, [bids, filter, games, range]);

  const matched = useMemo(() => resolveGame(url, games), [games, url]);
  const urlState = !url.trim() ? "empty" : matched ? "valid" : "invalid";
  const topBid = ranked[0] ? bidOf(ranked[0], bids, range) : 0;
  const minClaim = Math.max(1, Math.floor(topBid) + 1);

  useEffect(() => {
    setAmount(minClaim);
  }, [minClaim]);

  useEffect(() => {
    if (filter && !categories.includes(filter)) setFilter("");
  }, [categories, filter]);

  function placeBid() {
    if (!user) {
      window.location.assign(apexHref("/login"));
      return;
    }
    const game = matched;
    if (!game) {
      setNotice("That URL or slug is not a listing on PlayInWeb.");
      return;
    }
    if (!Number.isFinite(amount) || amount < minClaim) {
      setNotice(`Bid at least $${minClaim} to claim #1 in this view.`);
      return;
    }
    const next = { ...bids, [game.id]: { amount, at: Date.now() } };
    window.localStorage.setItem(BID_KEY, JSON.stringify(next));
    setBids(next);
    setNotice(`Preview bid of $${amount.toFixed(0)} is live for ${game.title}. No charge was made.`);
  }

  return (
    <FeatureGate id="showcase">
    <div className="flex min-w-0 flex-col gap-8 rounded-t-2xl bg-[linear-gradient(180deg,var(--surface-3)_0%,var(--bg)_36rem)]">
      <div>
        <section className="relative isolate mx-1 mt-1 overflow-hidden rounded-2xl">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <Image
              src="/home-hero.webp"
              alt=""
              fill
              priority
              unoptimized
              sizes="100vw"
              className="object-cover object-[68%_48%]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.16_0.03_250_/_0.78)_0%,oklch(0.18_0.03_250_/_0.42)_28%,oklch(0.2_0.03_250_/_0.12)_48%,transparent_62%)]" />
          </div>
          <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
            <Segmented
              aria-label="Time range"
              size="lg"
              className="border border-border shadow-panel"
              value={range}
              onChange={setRange}
              options={[
                {
                  value: "all",
                  label: (
                    <>
                      <IconTrophy className="h-3.5 w-3.5 shrink-0" />
                      All-time
                    </>
                  ),
                },
                {
                  value: "today",
                  label: (
                    <>
                      <IconCalendar className="h-3.5 w-3.5 shrink-0" />
                      Today
                    </>
                  ),
                },
                {
                  value: "week",
                  label: (
                    <>
                      <IconClock className="h-3.5 w-3.5 shrink-0" />
                      Week
                    </>
                  ),
                },
              ]}
            />
          </div>
          <div className="absolute left-3 top-3 z-20 sm:left-4 sm:top-4">
            <CompactStats fallbackVisitors={games.reduce((n, g) => n + (g.viewCount ?? 0), 0)} />
          </div>
          <div className="relative z-10 flex min-h-[132px] items-center justify-center px-6 pb-10 pt-8 sm:min-h-[148px] lg:min-h-[160px]">
            <h1 className="text-center text-[36px] font-semibold tracking-tight text-white [text-shadow:0_1px_2px_oklch(0_0_0_/_0.45),0_12px_28px_oklch(0_0_0_/_0.28)] sm:text-[48px]">
              Game showcase
            </h1>
          </div>
        </section>
        <div className="relative z-10 -mt-[26px] flex justify-center px-4 sm:-mt-7">
          <div className="max-w-full overflow-x-auto pb-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 p-1.5">
              <CategoryChip label="All" active={!filter} onClick={() => setFilter("")} />
              {categories.map((name) => (
                <CategoryChip
                  key={name}
                  label={prettyCategory(name)}
                  active={filter === name}
                  onClick={() => setFilter(name)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          placeBid();
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-4">
          <p className="text-[28px] font-semibold tracking-tight sm:text-[36px]">Claim #1 for</p>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full bg-accent text-accent-fg hover:bg-accent-hover sm:size-12"
            onClick={() => setAmount((n) => Math.max(minClaim, n - 1))}
            aria-label="Decrease bid"
          >
            <span className="text-[28px] leading-none font-medium">−</span>
          </button>
          <label className="inline-flex min-w-[6.5rem] items-baseline justify-center text-[36px] font-semibold tracking-tight sm:text-[44px]">
            <span className="sr-only">Bid amount in dollars</span>
            <span className="inline-flex items-baseline">
              <span aria-hidden>$</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setAmount(digits === "" ? 0 : Number(digits));
                }}
                onBlur={() => setAmount((n) => Math.max(minClaim, n))}
                className="m-0 bg-transparent p-0 leading-none tabular outline-none"
                style={{ width: `${String(amount).length}ch` }}
              />
            </span>
          </label>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full bg-accent text-accent-fg hover:bg-accent-hover sm:size-12"
            onClick={() => setAmount((n) => n + 1)}
            aria-label="Increase bid"
          >
            <span className="text-[28px] leading-none font-medium">+</span>
          </button>
        </div>

        <div className="mx-auto mt-6 w-full max-w-lg">
          <div
            className={cn(
              "flex h-12 items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm transition-colors",
              urlState === "invalid" && "ring-1 ring-warning",
              urlState === "valid" && "ring-1 ring-success",
            )}
          >
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setNotice("");
              }}
              placeholder="Game URL or @handle/slug"
              aria-label="Game URL"
              aria-invalid={urlState === "invalid"}
              className="h-full min-w-0 flex-1 rounded-lg bg-surface-2 px-3 text-body outline-none placeholder:text-text-muted focus:bg-surface-3"
            />
            {urlState === "valid" ? <IconCheck className="h-4 w-4 shrink-0 text-success" /> : null}
            {user || loading ? (
              <Button type="submit" variant="primary" className="h-10 shrink-0 px-4" disabled={loading || urlState !== "valid"}>
                Claim rank
              </Button>
            ) : (
              <LinkButton href={apexHref("/login")} variant="primary" className="h-10 shrink-0 px-4">
                Sign in
              </LinkButton>
            )}
          </div>
          {urlState === "valid" && matched ? (
            <p className="mt-2 text-center text-caption text-success">
              {matched.title}
              {matched.channelHandle ? ` · @${matched.channelHandle}/${matched.projectSlug}` : ""}
            </p>
          ) : null}
          {urlState === "invalid" ? (
            <p className="mt-2 text-center text-caption text-warning">No listing matches that URL or slug.</p>
          ) : null}
          <p className="mt-2 text-center text-meta text-text-subtle">
            Signed-in bids can target any listing. Payments are a preview for now.
          </p>
          {notice ? <p className="mt-2 text-center text-ui text-warning">{notice}</p> : null}
        </div>
      </form>

      <div className="mx-auto mt-12 w-full max-w-3xl">
        <RankedBlock games={ranked} bids={bids} range={range} max={max} />
      </div>
    </div>
    </FeatureGate>
  );
}

function prettyCategory(name: string) {
  return name.replace(/\b\w/g, (char) => char.toUpperCase());
}

function CompactStats({ fallbackVisitors }: { fallbackVisitors: number }) {
  const [online, setOnline] = useState(1);
  const [visitors, setVisitors] = useState(fallbackVisitors);

  useEffect(() => {
    setVisitors(fallbackVisitors);
  }, [fallbackVisitors]);

  useEffect(() => {
    let cancelled = false;

    async function loadVisitors() {
      try {
        const res = await fetch("/api/umami/stats");
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; visitors?: number };
        if (!cancelled && data.ok && typeof data.visitors === "number") {
          setVisitors(data.visitors);
        }
      } catch {
        // keep fallback
      }
    }

    void loadVisitors();
    const id = window.setInterval(loadVisitors, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const key = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
    const channel = supabase.channel("showcase-presence", {
      config: { presence: { key } },
    });

    const sync = () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      setOnline(Math.max(1, count));
    };

    channel.on("presence", { event: "sync" }, sync);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ page: "showcase", at: Date.now() });
        sync();
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-semibold tracking-[0.06em] text-white/90 backdrop-blur-sm [text-shadow:0_1px_2px_oklch(0_0_0_/_0.35)]">
      <span className="inline-flex items-center gap-1 tabular">
        <span className="relative flex size-1">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
          <span className="relative size-1 rounded-full bg-emerald-400" />
        </span>
        <span className="tabular">{formatPlays(online)}</span>
        <span className="font-medium tracking-[0.1em] text-white/75">ONLINE</span>
      </span>
      <span className="text-white/35" aria-hidden>
        ·
      </span>
      <span className="inline-flex items-center gap-1 tabular">
        <span className="tabular">{formatPlays(visitors)}</span>
        <span className="font-medium tracking-[0.1em] text-white/75">VISITORS</span>
      </span>
      <span className="text-white/35" aria-hidden>
        ·
      </span>
      <Link
        href={umamiShareUrl() || apexHref("/top")}
        target={umamiShareUrl() ? "_blank" : undefined}
        rel={umamiShareUrl() ? "noopener noreferrer" : undefined}
        className="font-medium tracking-[0.1em] text-white/90 underline-offset-2 hover:text-white hover:underline"
      >
        VIEW STATS
      </Link>
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-body font-medium sm:h-11 sm:px-5",
        active ? "bg-accent text-accent-fg" : "text-text-muted hover:text-text",
      )}
    >
      {label}
    </button>
  );
}

function RankedBlock({
  games,
  bids,
  range,
  max,
}: {
  games: Game[];
  bids: Record<string, Bid>;
  range: Range;
  max: number;
}) {
  const [first, second, third, ...rest] = games;
  const head = rest.slice(0, 5);
  const tail = rest.slice(5);
  const newest = [...games].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  return (
    <div>
      {first ? (
        <PodiumSlot
          game={first}
          rank={1}
          bid={bidOf(first, bids, range)}
          max={max}
          featured
        />
      ) : null}
      {second || third ? (
        <div className="mt-3 flex flex-col gap-3">
          {second ? (
            <PodiumSlot game={second} rank={2} bid={bidOf(second, bids, range)} max={max} />
          ) : null}
          {third ? (
            <PodiumSlot game={third} rank={3} bid={bidOf(third, bids, range)} max={max} />
          ) : null}
        </div>
      ) : null}
      {head.length > 0 ? (
        <ol className="mt-6 flex flex-col gap-3">
          {head.map((game, i) => (
            <li key={game.id}>
              <ShowcaseRow game={game} rank={i + 4} bid={bidOf(game, bids, range)} />
            </li>
          ))}
        </ol>
      ) : null}
      {newest.length > 0 ? (
        <div className="mt-8">
          <Shelf title="Newest">
            <GameRail games={newest} maxScore={max} variant="mini" />
          </Shelf>
        </div>
      ) : null}
      {tail.length > 0 ? (
        <ol className="mt-8 flex flex-col gap-3">
          {tail.map((game, i) => (
            <li key={game.id}>
              <ShowcaseRow game={game} rank={i + 9} bid={bidOf(game, bids, range)} />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function PodiumSlot({
  game,
  rank,
  bid,
  max,
  featured,
}: {
  game: Game;
  rank: 1 | 2 | 3;
  bid: number;
  max: number;
  featured?: boolean;
}) {
  const tone = rank === 1 ? "text-warning" : rank === 2 ? "text-text" : "text-text-muted";

  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      <span className="sr-only">Rank {rank}</span>
      <div className={cn("flex w-12 shrink-0 flex-col items-center gap-1 sm:w-16", tone)} aria-hidden>
        <IconTrophy className={cn("h-5 w-5 sm:h-6 sm:w-6", featured && "sm:h-7 sm:w-7")} />
        <span
          className={cn(
            "font-semibold tabular leading-none tracking-tight",
            featured ? "text-[28px] sm:text-[36px]" : "text-[24px] sm:text-[30px]",
          )}
        >
          #{rank}
        </span>
      </div>
      <div className="relative min-w-0 flex-1">
        {bid > 0 ? (
          <span className="absolute right-[4.75rem] top-3 z-10 rounded-md bg-accent px-2 py-0.5 text-badge font-medium uppercase text-accent-fg">
            ${bid.toFixed(0)} bid
          </span>
        ) : null}
        <GameCard game={game} maxScore={max} variant="featured" priority={featured} />
      </div>
    </div>
  );
}

function ShowcaseRow({ game, rank }: { game: Game; rank: number; bid: number }) {
  const href = gamePath(game);
  const play = game.embeddable && game.playUrl ? `${href}?play=1` : href;

  return (
    <article className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-panel bg-surface-2 px-4 py-3.5 hover:bg-surface-3 sm:grid-cols-[3rem_140px_minmax(0,1fr)_auto]">
      <Link href={href} className="text-center text-body font-semibold tabular text-text-muted">
        #{rank}
      </Link>
      <Link href={href} className="relative hidden aspect-video overflow-hidden rounded-lg bg-surface-2 sm:block">
        <GameThumb game={game} sizes="140px" />
      </Link>
      <div className="min-w-0">
        <h3 className="truncate text-ui font-medium">
          <Link href={href} className="text-text hover:text-text-muted">
            {game.title}
          </Link>
        </h3>
        <p className="truncate text-caption text-text-subtle">{game.developer}</p>
        <p className="mt-1.5 text-caption text-text-subtle">
          <span className="tabular">{formatPlays(game.viewCount ?? 0)} views</span>
          <span aria-hidden> · </span>
          <span className="tabular">{formatPlays(game.playCount)} plays</span>
          <span aria-hidden> · </span>
          <span className="tabular">{formatPlays(game.likeCount)} likes</span>
        </p>
      </div>
      <LinkButton href={play} variant="primary" size="sm" className="gap-1.5">
        <IconPlay className="h-3.5 w-3.5" />
        Play
      </LinkButton>
    </article>
  );
}
