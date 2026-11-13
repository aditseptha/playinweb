"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GameThumb } from "@/components/GameThumb";
import { IconCalendar, IconCheck, IconClock, IconPlay, IconTrophy } from "@/components/icons";
import { useLoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ds/button";
import { EmptyState } from "@/components/ds/empty-state";
import { FeatureGate } from "@/components/FeatureGate";
import s from "@/components/home/home.module.css";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatMoney, formatPlays, gamePath } from "@/lib/format";
import { apexHref, parseSubdomain } from "@/lib/host";
import {
  aggregateShowcaseBids,
  minShowcaseClaimAmount,
  type ShowcaseBid,
  type ShowcaseRange,
} from "@/lib/showcase-bids";
import { useGames } from "@/lib/store";
import { useSiteOnlineCount } from "@/lib/site-presence";
import { createClient } from "@/lib/supabase/client";
import { umamiShareUrl } from "@/lib/umami";
import type { Game } from "@/lib/types";

function categoryOf(game: Game) {
  return game.tags[0] ? game.tags[0] : "Other";
}

function bidOf(game: Game, bids: Record<string, ShowcaseBid>) {
  return bids[game.id]?.amount ?? game.promotionBoost ?? 0;
}

type BidRow = { project_id: string; amount: number; created_at: string };

async function fetchBidRows(): Promise<BidRow[] | null> {
  const { data, error } = await createClient()
    .from("showcase_bids")
    .select("project_id, amount, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return error ? null : (data ?? []);
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
  const searchParams = useSearchParams();
  const { games } = useGames();
  const { user, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const [bidRows, setBidRows] = useState<BidRow[]>([]);
  const [pickedFilter, setFilter] = useState("");
  const [range, setRange] = useState<ShowcaseRange>("all");
  const [url, setUrl] = useState("");
  const [amount, setAmount] = useState(1);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const polarCheckout = searchParams.get("polar_checkout") ?? searchParams.get("checkout_id");
  // The checkout confirm (and the user it ran for) that has finished; anything else is still in flight.
  const [confirmed, setConfirmed] = useState<{ checkout: string; user: typeof user } | null>(null);
  const confirming =
    Boolean(polarCheckout && !loading && user) &&
    !(confirmed?.checkout === polarCheckout && confirmed.user === user);
  const pending = submitting || confirming;

  const loadBids = useCallback(async () => {
    const rows = await fetchBidRows();
    if (rows) setBidRows(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchBidRows().then((rows) => {
      if (!cancelled && rows) setBidRows(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bids = useMemo(() => aggregateShowcaseBids(bidRows, range), [bidRows, range]);

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
  // A picked category that dropped out of the top list falls back to "All".
  const filter = pickedFilter && categories.includes(pickedFilter) ? pickedFilter : "";

  const ranked = useMemo(() => {
    const pool = filter ? games.filter((g) => categoryOf(g) === filter) : games;
    return [...pool].sort((a, b) => {
      const bidGap = bidOf(b, bids) - bidOf(a, bids);
      if (bidGap !== 0) return bidGap;
      return b.playCount - a.playCount;
    });
  }, [bids, filter, games]);

  const matched = useMemo(() => resolveGame(url, games), [games, url]);
  const urlState = !url.trim() ? "empty" : matched ? "valid" : "invalid";
  const topBid = ranked[0] ? bidOf(ranked[0], bids) : 0;
  const minClaim = minShowcaseClaimAmount(topBid);

  const [amountFloor, setAmountFloor] = useState<number | null>(null);
  if (amountFloor !== minClaim) {
    setAmountFloor(minClaim);
    setAmount(minClaim);
  }

  useEffect(() => {
    if (!polarCheckout || loading || !user) return;
    let cancelled = false;
    fetch("/api/polar/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkoutId: polarCheckout }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { amount?: number; error?: string } | null;
        if (cancelled) return;
        if (!res.ok) {
          setNotice(data?.error || "Could not confirm this showcase bid.");
          return;
        }
        const paidAmount = Number(data?.amount);
        setNotice(
          Number.isFinite(paidAmount)
            ? `Thanks — your ${formatMoney(paidAmount)} bid is live on the showcase.`
            : "Thanks — your showcase bid is live.",
        );
        await loadBids();
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("polar_checkout");
        nextUrl.searchParams.delete("checkout_id");
        window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      })
      .catch(() => {
        if (!cancelled) setNotice("Could not confirm this showcase bid.");
      })
      .finally(() => {
        if (!cancelled) setConfirmed({ checkout: polarCheckout, user });
      });
    return () => {
      cancelled = true;
    };
  }, [loading, loadBids, polarCheckout, user]);

  async function placeBid() {
    if (loading || pending) return;
    if (!user) {
      openLogin();
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
    setSubmitting(true);
    setNotice("");
    const here = window.location.href;
    const res = await fetch("/api/polar/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "showcase",
        projectId: game.id,
        amount,
        range,
        successUrl: here,
        returnUrl: here,
      }),
    });
    const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!res.ok || !data?.url) {
      setSubmitting(false);
      setNotice(data?.error || "Could not start Polar checkout.");
      return;
    }
    window.location.assign(data.url);
  }

  const paid = notice.startsWith("Thanks");
  const [first, second, third, ...rest] = ranked;

  return (
    <div className={cn(s.create, s.pageSkin)}>
    <FeatureGate id="showcase">
    <div className={s.frame}>
      <div className={s.wrap}>
        <p className={s.eyebrow}>PlayInWeb</p>
        <h1 className={s.createTitle}>Showcase</h1>
        <p className={s.legalIntro}>Bid to hold the top spot. The order follows bids in the period you pick.</p>
        <CompactStats fallbackVisitors={games.reduce((n, g) => n + (g.viewCount ?? 0), 0)} />
        <div className={s.showRanges} role="group" aria-label="Ranking period">
          {(
            [
              { value: "today", label: "Today", icon: IconCalendar },
              { value: "week", label: "This week", icon: IconClock },
              { value: "all", label: "All time", icon: IconTrophy },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={s.showRange}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <div className={s.showCats} role="group" aria-label="Category">
          <button type="button" className={s.showCat} aria-pressed={!filter} onClick={() => setFilter("")}>
            All
          </button>
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              className={s.showCat}
              aria-pressed={filter === name}
              onClick={() => setFilter(name)}
            >
              {prettyCategory(name)}
            </button>
          ))}
        </div>

        <form
          className={s.showClaim}
          onSubmit={(e) => {
            e.preventDefault();
            void placeBid();
          }}
        >
          <h2 className={s.secTitle}>Claim #1</h2>
          <p className={s.legalIntro}>The lowest bid that takes the lead in this view is ${minClaim}.</p>
          <div className={s.showStepper}>
            <button type="button" className={s.showStep} aria-label="Decrease bid" onClick={() => setAmount((n) => Math.max(minClaim, n - 1))}>
              −
            </button>
            <label className={s.showAmountWrap}>
              <span className="sr-only">Bid amount in dollars</span>
              <span className={s.showDollar} aria-hidden>
                $
              </span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setAmount(digits === "" ? 0 : Number(digits));
                }}
                onBlur={() => setAmount((n) => Math.max(minClaim, n))}
                className={s.showAmount}
                style={{ width: `${Math.max(1, String(amount).length)}ch` }}
                aria-label="Bid amount in dollars"
              />
            </label>
            <button type="button" className={s.showStep} aria-label="Increase bid" onClick={() => setAmount((n) => n + 1)}>
              +
            </button>
          </div>
          <div className={s.showUrl}>
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setNotice("");
              }}
              placeholder="Game URL or @handle/slug"
              aria-label="Game URL"
              aria-invalid={urlState === "invalid"}
            />
            {urlState === "valid" ? <IconCheck className="h-4 w-4 shrink-0" /> : null}
            {user || loading ? (
              <Button type="submit" variant="primary" disabled={loading || pending || urlState !== "valid"}>
                {pending ? "Redirecting…" : "Claim rank"}
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={() => openLogin()}>
                Sign in
              </Button>
            )}
          </div>
          {urlState === "valid" && matched ? (
            <p className={s.legalIntro}>
              {matched.title}
              {matched.channelHandle ? ` · @${matched.channelHandle}/${matched.projectSlug}` : ""}
            </p>
          ) : null}
          {urlState === "invalid" ? (
            <p className={s.legalIntro}>No listing matches that URL or slug.</p>
          ) : null}
          {paid ? (
            <EmptyState kind="user" illustration="success" title="Bid received" body={notice} />
          ) : notice ? (
            <p className={s.legalIntro}>{notice}</p>
          ) : null}
        </form>

        {ranked.length === 0 ? (
          <EmptyState
            kind="no-results"
            illustration="no-results"
            title="No games in this view"
            body="Try another category, or another period."
          />
        ) : (
          <>
            <div className={s.showPodium}>
              {first ? <PodiumCard game={first} rank={1} bid={bidOf(first, bids)} /> : null}
              {second ? <PodiumCard game={second} rank={2} bid={bidOf(second, bids)} /> : null}
              {third ? <PodiumCard game={third} rank={3} bid={bidOf(third, bids)} /> : null}
            </div>
            {rest.length > 0 ? (
              <ol className={s.showList}>
                {rest.slice(0, 47).map((game, i) => (
                  <li key={game.id}>
                    <RankRow game={game} rank={i + 4} bid={bidOf(game, bids)} />
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        )}
      </div>
    </div>
    </FeatureGate>
    </div>
  );
}

function prettyCategory(name: string) {
  return name.replace(/\b\w/g, (char) => char.toUpperCase());
}

function CompactStats({ fallbackVisitors }: { fallbackVisitors: number }) {
  const [visitors, setVisitors] = useState(fallbackVisitors);
  const [prevFallback, setPrevFallback] = useState(fallbackVisitors);
  if (prevFallback !== fallbackVisitors) {
    setPrevFallback(fallbackVisitors);
    setVisitors(fallbackVisitors);
  }

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

  const liveOnline = useSiteOnlineCount();
  const online = liveOnline !== null && liveOnline > 0 ? liveOnline : 1;

  return (
    <p className={s.legalIntro}>
      {formatPlays(online)} online
      <span aria-hidden> · </span>
      {formatPlays(visitors)} visitors
      <span aria-hidden> · </span>
      <Link href={umamiShareUrl() || apexHref("/top")}>View stats</Link>
    </p>
  );
}

function PodiumCard({ game, rank, bid }: { game: Game; rank: 1 | 2 | 3; bid: number }) {
  const href = gamePath(game);
  return (
    <article>
      <Link href={href} className={s.showCover}>
        <GameThumb game={game} sizes="280px" ratio="portrait" priority={rank === 1} />
        <span className={s.showBadge}>#{rank}</span>
        {bid > 0 ? <span className={s.showBidTag}>${bid.toFixed(0)}</span> : null}
      </Link>
      <Link href={href} className={s.showName}>
        {game.title}
      </Link>
      <p className={s.showBy}>{game.developer}</p>
    </article>
  );
}

function RankRow({ game, rank, bid }: { game: Game; rank: number; bid: number }) {
  const href = gamePath(game);
  const play = game.embeddable && game.playUrl ? `${href}?play=1` : href;
  return (
    <article className={s.showRow}>
      <span className={s.showPlace}>#{rank}</span>
      <Link href={href} className={s.showCopy}>
        <b>{game.title}</b>
        <small>
          {game.developer}
          {bid > 0 ? ` · $${bid.toFixed(0)} bid` : ""}
          {" · "}
          {formatPlays(game.playCount)} plays
        </small>
      </Link>
      <Link href={play} className={cn(s.btn, s.btnPrimary)}>
        <IconPlay className="h-3.5 w-3.5" />
        Play
      </Link>
    </article>
  );
}
