import Link from "next/link";
import { playHref } from "@/components/GameCard";
import { GameThumb } from "@/components/GameThumb";
import { posterFont } from "@/components/home/fonts";
import { isNewThisWeek, type Creator } from "@/components/home/filters";
import { IconHeart, IconPlay, IconPlus, IconUser } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatPlays, gamePath, hueFromId, initials } from "@/lib/format";
import { apexHref, siteOrigin } from "@/lib/host";
import type { Game } from "@/lib/types";

const CARD_SHELL =
  "group relative isolate block overflow-hidden rounded-[18px] bg-surface-2 ring-1 ring-inset ring-white/10 transition-[transform,box-shadow] duration-300 ease-out-quint hover:-translate-y-0.5 hover:shadow-panel focus-within:-translate-y-0.5";

const TITLE_SHADOW = "[text-shadow:0_2px_0_oklch(0%_0_0/0.45),0_8px_24px_oklch(0%_0_0/0.5)]";

function PlayButton({ game, className }: { game: Game; className?: string }) {
  return (
    <Link
      href={playHref(game)}
      aria-label={`Play ${game.title}`}
      className={cn(
        "relative z-10 grid size-11 shrink-0 place-items-center rounded-xl bg-home-primary text-white shadow-[0_0_0_1px_oklch(100%_0_0/0.2)_inset,0_8px_20px_-6px_var(--home-primary)] transition-[transform,background-color] duration-200 hover:scale-105 active:scale-95",
        className,
      )}
    >
      <IconPlay className="h-5 w-5 translate-x-px" />
    </Link>
  );
}

/** Covers the whole card so the image and text open the game page; the play button sits above it. */
function CardLink({ game }: { game: Game }) {
  return (
    <Link
      href={gamePath(game)}
      aria-label={game.title}
      className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
    />
  );
}

function LikesChip({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[12px] font-semibold text-white backdrop-blur-sm tabular">
      <IconHeart className="h-3 w-3" />
      {formatPlays(count)}
    </span>
  );
}

function Meta({ game, className }: { game: Game; className?: string }) {
  return (
    <p className={cn("flex min-w-0 items-center gap-2.5 text-[13px] text-white/75", className)}>
      <span className="truncate">{game.developer}</span>
      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-white tabular">
        <IconUser className="h-3.5 w-3.5 opacity-80" />
        {formatPlays(game.playCount)}
      </span>
      {game.likeCount > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-white tabular">
          <IconHeart className="h-3.5 w-3.5 opacity-80" />
          {formatPlays(game.likeCount)}
        </span>
      ) : null}
    </p>
  );
}

/** Large landscape card for the featured row. */
export function FeatureCard({ game, priority = false }: { game: Game; priority?: boolean }) {
  return (
    <article className={cn(CARD_SHELL, "aspect-[3/2]")}>
      <GameThumb game={game} priority={priority} sizes="(min-width: 1024px) 33vw, 85vw" />
      <CardLink game={game} />
      {game.embeddable ? (
        <span className="pointer-events-none absolute left-3 top-3 z-[2] inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-home-amber" aria-hidden />
          Instant play
        </span>
      ) : null}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[2] flex items-center gap-3 rounded-2xl border border-white/10 bg-[oklch(16%_0.035_282/0.62)] py-2.5 pl-4 pr-2.5 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[19px] font-semibold tracking-tight text-white">{game.title}</h3>
          <Meta game={game} className="mt-0.5" />
        </div>
        <PlayButton game={game} className="pointer-events-auto" />
      </div>
    </article>
  );
}

/** Portrait card with the title set in poster type over the art. */
export function PosterCard({
  game,
  badge,
  priority = false,
}: {
  game: Game;
  badge?: "new" | "top" | null;
  priority?: boolean;
}) {
  const label = badge === undefined ? (isNewThisWeek(game.createdAt) ? "new" : null) : badge;
  return (
    <article className={cn(CARD_SHELL, "aspect-[3/4]")}>
      <GameThumb game={game} priority={priority} sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 45vw" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <CardLink game={game} />
      <div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-[2] flex items-start justify-between gap-2">
        {label === "new" ? (
          <span className="rounded-full bg-home-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-white">
            New
          </span>
        ) : label === "top" ? (
          <span className="rounded-full bg-home-amber px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[oklch(25%_0.06_60)]">
            Top
          </span>
        ) : (
          <span />
        )}
        <LikesChip count={game.likeCount} />
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[2] text-center">
        <h3
          className={cn(
            posterFont.className,
            "line-clamp-3 text-[clamp(19px,1.75vw,26px)] font-extrabold uppercase leading-[0.95] tracking-[0.01em] text-white [overflow-wrap:anywhere]",
            TITLE_SHADOW,
          )}
        >
          {game.title}
        </h3>
        <p className="mt-1.5 truncate text-[12px] text-white/75">
          {game.developer} · <span className="tabular">{formatPlays(game.playCount)}</span> plays
        </p>
      </div>
    </article>
  );
}

/** Wide landscape card for a themed shelf. */
export function WideCard({ game }: { game: Game }) {
  return (
    <article className={cn(CARD_SHELL, "aspect-[16/9]")}>
      <GameThumb game={game} sizes="(min-width: 1024px) 33vw, 85vw" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <CardLink game={game} />
      <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[2] flex items-end gap-3 pl-1">
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              posterFont.className,
              "line-clamp-2 text-[clamp(24px,2.4vw,34px)] font-extrabold uppercase leading-[0.92] text-white",
              TITLE_SHADOW,
            )}
          >
            {game.title}
          </h3>
          <p className="mt-1.5 truncate text-[12px] text-white/75">
            {game.developer} · <span className="tabular">{formatPlays(game.playCount)}</span> plays
          </p>
        </div>
        <PlayButton game={game} className="pointer-events-auto" />
      </div>
    </article>
  );
}

/** Placeholder that invites creators to publish while the catalogue is small. */
export function SlotCard() {
  return (
    <Link
      href={apexHref("/register")}
      className="group flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-[18px] border-2 border-dashed border-border-strong p-4 text-center transition-colors hover:border-accent hover:bg-surface"
    >
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-text transition-colors group-hover:bg-accent group-hover:text-accent-fg">
        <IconPlus className="h-5 w-5" />
      </span>
      <span className="text-[16px] font-semibold leading-snug">Your game here</span>
      <span className="text-caption text-text-subtle">Publish for free</span>
    </Link>
  );
}

/** Pastel initials disc, readable in both themes (the shared Avatar uses theme text on grey). */
export function InitialsAvatar({ name, size }: { name: string; size: number }) {
  const hue = hueFromId(name);
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.34),
        background: `oklch(0.82 0.11 ${hue})`,
        color: `oklch(0.3 0.08 ${hue})`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function CreatorChip({ creator }: { creator: Creator }) {
  return (
    <Link
      href={siteOrigin(creator.handle)}
      className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3 pr-4 transition-colors hover:border-border-strong hover:bg-surface-3"
    >
      <InitialsAvatar name={creator.name} size={44} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold">{creator.name}</span>
        <span className="block truncate text-caption text-text-subtle tabular">
          {creator.games} {creator.games === 1 ? "game" : "games"} · {formatPlays(creator.plays)} plays
        </span>
      </span>
    </Link>
  );
}
