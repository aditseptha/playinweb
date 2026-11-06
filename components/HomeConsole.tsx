"use client";

import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type RefObject } from "react";
import { BrandMark } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { GameThumb } from "@/components/GameThumb";
import { IconPlay, IconSearch } from "@/components/icons";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { navItemVisible, useFeatures } from "@/lib/features";
import { channelPath, formatPlays, gamePath } from "@/lib/format";
import { apexHref } from "@/lib/host";
import { publicMediaUrl } from "@/lib/media";
import { gamesForChannel, historyGames, homeRailGames, sortGames, useGames, withInitialGames } from "@/lib/store";
import type { Game } from "@/lib/types";

// Flat 24px glyphs in the console style; paths use even-odd so inner cut-outs read as gaps.
const TABS = [
  {
    href: "/home-v2",
    label: "Home",
    d: "M12 3.2 2.5 11.1a1 1 0 0 0 1.3 1.5L5 11.6V19a2 2 0 0 0 2 2h3.5v-5.5h3V21H17a2 2 0 0 0 2-2v-7.4l1.2 1a1 1 0 1 0 1.3-1.5z",
  },
  {
    href: "/top",
    label: "Top Played",
    d: "M7 3h10v2h3a1 1 0 0 1 1 1v2a5 5 0 0 1-4.4 5A5 5 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1A5 5 0 0 1 7.4 13 5 5 0 0 1 3 8V6a1 1 0 0 1 1-1h3zm10 4v3.8A3 3 0 0 0 19 8V7zM7 7H5v1a3 3 0 0 0 2 2.8z",
  },
  {
    href: "/showcase",
    label: "Showcase",
    d: "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z",
  },
  {
    href: "/library",
    label: "Library",
    d: "M9 3h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-.5V5H7a2 2 0 0 1 2-2zM3 9a2 2 0 0 1 2-2h9.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  },
];
// The sidebar's Support and legal links, as plain text.
const FOOTER_LINKS = [
  { href: "/tip", label: "Tip the developer" },
  { href: "/report", label: "Report an issue" },
  { href: "mailto:support@playinweb.com", label: "Contact us" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];
const MAX_TILES = 10;

type ShelfId = "recent" | "mine" | "new" | "discover";
type GameShelf = { id: ShelfId; label: string; href: string; games: Game[] };

export function HomeConsole({ initialGames }: { initialGames: Game[] }) {
  const store = useGames();
  const { profile } = useAuth();
  const games = useMemo(() => withInitialGames(store.games, initialGames), [store.games, initialGames]);
  const handle = profile?.handle;
  // Empty shelves are dropped, so "My uploads" only shows for signed-in creators.
  const shelves = useMemo<GameShelf[]>(
    () =>
      [
        { id: "recent" as const, label: "Last played", href: "/profile", games: historyGames(games, store.history) },
        {
          id: "mine" as const,
          label: "My uploads",
          href: "/manage",
          games: handle ? gamesForChannel(games, handle, { myGameIds: store.myGameIds, profileHandle: handle }) : [],
        },
        { id: "new" as const, label: "New games", href: "/?sort=new", games: sortGames(games, "new") },
        { id: "discover" as const, label: "Discover", href: "/top", games: homeRailGames(games, games.length) },
      ].filter((shelf) => shelf.games.length > 0),
    [games, store.history, store.myGameIds, handle],
  );
  const [shelfId, setShelfId] = useState<ShelfId | null>(null);
  // Default: pick up where you left off, otherwise browse.
  const shelf =
    shelves.find((s) => s.id === shelfId) ??
    shelves.find((s) => s.id === "recent") ??
    shelves.find((s) => s.id === "discover") ??
    shelves[0];
  const tiles = shelf?.games.slice(0, MAX_TILES) ?? [];
  const more = shelf?.games.slice(MAX_TILES) ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  const index = Math.max(0, tiles.findIndex((g) => g.id === selectedId));
  const game = tiles[index];
  const prev = games.find((g) => g.id === prevId && g.id !== game?.id);
  const rowRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  function select(id: string) {
    if (id === game?.id) return;
    setPrevId(game?.id ?? null);
    setSelectedId(id);
  }

  function pickShelf(next: GameShelf) {
    setShelfId(next.id);
    setPrevId(game?.id ?? null);
    setSelectedId(next.games[0]?.id ?? null);
    rowRef.current?.scrollTo({ left: 0 });
  }

  function onRowKey(e: KeyboardEvent) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = Math.min(tiles.length - 1, Math.max(0, index + step));
    tileRefs.current[next]?.focus();
  }

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      setSearchOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="scrollbar-hide relative isolate flex h-dvh flex-col overflow-x-hidden overflow-y-auto bg-(--console-bg) text-white [--console-bg:oklch(0.17_0.025_255)]">
      {/* Key art sits bottom-right and melts into the solid page colour on its top and left edges. */}
      <div
        className="pointer-events-none fixed right-0 bottom-0 -z-10 h-[65%] w-full sm:h-[85%] sm:w-[82%] lg:w-[78%]"
        aria-hidden
      >
        {prev ? <GameThumb key={prev.id} game={prev} sizes="(min-width: 1024px) 78vw, 100vw" /> : null}
        {game ? (
          <div key={game.id} className="absolute inset-0 animate-[console-fade_700ms_var(--ease-out-quint)] motion-reduce:animate-none">
            <GameThumb game={game} sizes="(min-width: 1024px) 78vw, 100vw" quality={80} priority />
          </div>
        ) : null}
        <div className="absolute inset-0 bg-(--console-bg)/40" />
        <div className="absolute inset-0 bg-linear-to-r from-(--console-bg) via-(--console-bg)/35 via-15% to-transparent to-40%" />
        <div className="absolute inset-0 bg-linear-to-b from-(--console-bg) via-(--console-bg)/20 via-15% to-transparent to-35%" />
      </div>

      <TopBar searchRef={searchRef} searchOpen={searchOpen} onSearchOpen={setSearchOpen} />

      {/* Fixed top offset, not centring, so the tile row never moves when the info panel changes height. */}
      <main id="content" className="flex flex-1 flex-col gap-6 pt-[clamp(1rem,9vh,6rem)] pb-8">
        {shelves.length > 1 ? (
          <div role="group" aria-label="Game lists" className="scrollbar-hide -mb-2 flex gap-2 overflow-x-auto px-4 sm:px-10 lg:mt-[100px] lg:px-16">
            {shelves.map((item) => {
              const on = item.id === shelf?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickShelf(item)}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[14px] font-medium backdrop-blur-md transition-[background-color,border-color,color] duration-200",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                    // Selected chip gets the shared liquid-glass sheen; the rest stay frosted and quiet.
                    on
                      ? "liquid-glass text-white"
                      : "border border-white/15 bg-white/[0.06] text-white/70 hover:border-white/25 hover:bg-white/[0.12] hover:text-white",
                  )}
                >
                  {/* Above liquid-glass's ::before highlight layer. */}
                  <span className="relative">{item.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        {tiles.length === 0 ? (
          <p className="px-4 text-lg text-white/80 sm:px-10 lg:px-16">No games published yet.</p>
        ) : (
          // Fixed height, not min-height: mid-transition both resizing tiles are shorter, which would let the row dip and move the title.
          <div
            ref={rowRef}
            role="group"
            aria-label={shelf?.label ?? "Games"}
            onKeyDown={onRowKey}
            className="scrollbar-hide flex h-40 items-center gap-3 overflow-x-auto px-4 sm:h-48 sm:gap-4 sm:px-10 lg:h-56 lg:px-16"
          >
            {tiles.map((tile, i) => {
              const active = i === index;
              return (
                <Link
                  key={tile.id}
                  ref={(el) => {
                    tileRefs.current[i] = el;
                  }}
                  href={gamePath(tile)}
                  tabIndex={active ? 0 : -1}
                  aria-label={tile.title}
                  aria-current={active ? "true" : undefined}
                  onFocus={() => select(tile.id)}
                  onMouseEnter={() => select(tile.id)}
                  onClick={(e) => {
                    // First tap on touch selects the tile; the second one opens the game.
                    if (!active) {
                      e.preventDefault();
                      select(tile.id);
                    }
                  }}
                  className={cn(
                    "group relative aspect-video shrink-0 overflow-hidden rounded-xl bg-white/10 shadow-[0_12px_32px_oklch(0_0_0_/_0.45)]",
                    "transition-[width,opacity,outline-color] duration-300 ease-out-quint motion-reduce:transition-none",
                    // Size marks the selection; the ring is only for keyboard focus.
                    "outline-3 outline-offset-3 outline-transparent focus-visible:outline-brand-blue",
                    active
                      ? "w-52 sm:w-64 lg:w-80"
                      : "w-40 opacity-85 hover:opacity-100 sm:w-52 lg:w-64",
                  )}
                >
                  <GameThumb game={tile} priority={i < 4} sizes="(min-width: 1024px) 320px, 256px" />
                </Link>
              );
            })}
            {more.length > 0 && shelf ? <MoreTile games={more} href={shelf.href} /> : null}
          </div>
        )}

        {game ? (
          <section aria-live="polite" className="max-w-3xl px-4 [text-shadow:0_1px_12px_oklch(0_0_0_/_0.7)] sm:px-10 lg:mt-[50px] lg:px-16">
            <h1 className="text-[36px] font-bold leading-[1.05] tracking-tight [text-shadow:0_2px_16px_oklch(0_0_0_/_0.5)] sm:text-[48px] lg:text-[56px]">
              {game.title}
            </h1>
            {game.description ? (
              <p className="mt-2 line-clamp-2 max-w-[60ch] text-[15px] leading-relaxed text-white/80 sm:text-[16px]">
                {game.description}
              </p>
            ) : null}
            <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
              <Stat label="Plays" value={formatPlays(game.playCount)} />
              <Stat label="Likes" value={formatPlays(game.likeCount)} />
              <div className="min-w-0">
                <dt className="text-[12px] text-white/65">Creator</dt>
                <dd className="mt-1 truncate text-[22px] font-medium sm:text-[26px]">
                  <Link href={channelPath(game.developer, game.channelHandle)} className="hover:underline">
                    {game.developer}
                  </Link>
                </dd>
              </div>
            </dl>
            <Link
              href={gamePath(game)}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 [text-shadow:none] text-[16px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand-blue motion-reduce:transition-none"
            >
              <IconPlay className="h-5 w-5" />
              Play
            </Link>
          </section>
        ) : null}
      </main>

      <footer className="px-4 pb-6 sm:px-10 lg:px-16">
        <SupportLinks />
      </footer>
    </div>
  );
}

function TopBar({
  searchRef,
  searchOpen,
  onSearchOpen,
}: {
  searchRef: RefObject<HTMLInputElement | null>;
  searchOpen: boolean;
  onSearchOpen: (open: boolean) => void;
}) {
  const { user, profile, loading } = useAuth();
  const { features, loading: featuresLoading } = useFeatures();
  const admin = isAdminEmail(user?.email);
  const tabs = TABS.filter((tab) => navItemVisible(tab.href, features, admin, featuresLoading));

  return (
    <header className="relative grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-4 px-4 pt-5 sm:grid-cols-[1fr_auto_1fr] sm:px-10 sm:pt-8 lg:px-16">
      {/* Same mark + lettermark as the classic home's BrandLink, pinned to the white lettermark: this page is always dark. */}
      <Link href="/home-v2" aria-label="PlayInWeb home" className="flex items-center gap-2 justify-self-start rounded-lg">
        <BrandMark />
        <Image
          src="/playinweb-lettermark-white.webp"
          alt=""
          width={109}
          height={20}
          // ~1KB file: resized variants wouldn't be any smaller.
          unoptimized
          className="hidden h-5 w-auto translate-y-[2.5px] sm:block"
        />
      </Link>

      <nav
        aria-label="Sections"
        className="col-span-2 row-start-2 justify-self-center sm:col-span-1 sm:col-start-2 sm:row-start-1"
      >
        <ul className="flex gap-3">
          {tabs.map((tab) => {
            const current = tab.href === "/home-v2";
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={current ? "page" : undefined}
                  title={tab.label}
                  className={cn(
                    "grid size-11 place-items-center rounded-lg transition-opacity duration-200",
                    "focus-visible:outline-2 focus-visible:outline-white",
                    current ? "opacity-100" : "opacity-50 hover:opacity-100",
                  )}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden className="size-[22px]">
                    <path d={tab.d} />
                  </svg>
                  <span className="sr-only">{tab.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex min-w-0 items-center gap-4 justify-self-end">
      {/* Below lg the field collapses to an icon and opens as an overlay across the header row. */}
      <button
        type="button"
        aria-label="Search games"
        onClick={() => {
          onSearchOpen(true);
          requestAnimationFrame(() => searchRef.current?.focus());
        }}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur hover:bg-white/25 lg:hidden"
      >
        <IconSearch className="h-4 w-4" />
      </button>
      <Form
        action="/"
        className={cn(
          "h-11 items-center gap-2 rounded-full px-3 backdrop-blur lg:static lg:flex lg:h-10 lg:w-64 lg:bg-white/15 lg:focus-within:bg-white/25",
          searchOpen ? "absolute inset-x-4 top-5 z-20 flex bg-[oklch(0.27_0.02_255)] sm:inset-x-10 sm:top-8" : "hidden",
        )}
      >
        <IconSearch className="h-4 w-4 shrink-0 text-white/75" />
        <label htmlFor="console-search" className="sr-only">
          Search games
        </label>
        <input
          ref={searchRef}
          id="console-search"
          name="q"
          type="search"
          placeholder="Search"
          className="h-full min-w-0 flex-1 border-0 bg-transparent text-[14px] text-white placeholder:text-white/60 focus:outline-none"
          onBlur={(e) => {
            if (!e.currentTarget.value) onSearchOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.blur();
              onSearchOpen(false);
            }
          }}
        />
      </Form>
        {loading ? (
          <div className="size-10 rounded-full bg-white/15" />
        ) : user ? (
          <Link href={apexHref("/profile")} className="flex min-w-0 items-center gap-3 rounded-full">
            <Avatar
              name={profile?.display_name ?? ""}
              src={publicMediaUrl(profile?.avatar_path) || undefined}
              size={40}
            />
            <span className="hidden max-w-[10rem] truncate text-[14px] font-medium lg:inline">{profile?.display_name || profile?.handle}</span>
          </Link>
        ) : (
          <Link
            href={apexHref("/login")}
            className="shrink-0 whitespace-nowrap rounded-full bg-white/15 px-4 py-2 text-[14px] font-medium backdrop-blur hover:bg-white/25"
          >
            Sign in
          </Link>
        )}
      <WifiStatus />
      </div>
    </header>
  );
}

function SupportLinks() {
  const { user } = useAuth();
  const { features, loading } = useFeatures();
  const admin = isAdminEmail(user?.email);
  const links = FOOTER_LINKS.filter((item) => navItemVisible(item.href, features, admin, loading));
  return (
    <nav aria-label="Support" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/70">
      <ul className="contents">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-white/50">© 2026 PlayInWeb</p>
    </nav>
  );
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function WifiStatus() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const label = online ? "Online" : "Offline";
  return (
    <span role="status" title={label} className={cn("shrink-0", !online && "text-white/50")}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-[22px]">
        <path d="M2.5 9a14 14 0 0 1 19 0M5.6 12.4a9.5 9.5 0 0 1 12.8 0M8.7 15.7a5 5 0 0 1 6.6 0" />
        <circle cx="12" cy="19.4" r="1.4" fill="currentColor" stroke="none" />
        {online ? null : <path d="M3.5 3.5l17 17" className="text-white" />}
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function MoreTile({ games, href }: { games: Game[]; href: string }) {
  const shown = games.slice(0, 4);
  const extra = games.length - 3;
  return (
    <Link
      href={href}
      aria-label={`See ${games.length} more games`}
      className="grid aspect-video w-40 shrink-0 grid-cols-2 gap-1.5 rounded-xl bg-white/10 p-1.5 backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-3 focus-visible:outline-brand-blue sm:w-52 lg:w-64"
    >
      {shown.map((g, i) => (
        <span key={g.id} className="relative overflow-hidden rounded-md">
          <GameThumb game={g} sizes="88px" />
          {i === 3 && extra > 1 ? (
            <span className="absolute inset-0 grid place-items-center bg-black/55 text-[18px] font-semibold">
              +{extra}
            </span>
          ) : null}
        </span>
      ))}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-white/65">{label}</dt>
      <dd className="mt-1 text-[22px] font-medium tabular-nums sm:text-[26px]">{value}</dd>
    </div>
  );
}
