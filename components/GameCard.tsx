import { Silkscreen } from "next/font/google";
import Link from "next/link";
import { GameThumb } from "@/components/GameThumb";
import { IconPlay } from "@/components/icons";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { channelPath, formatPlays, gamePath } from "@/lib/format";
import type { Game } from "@/lib/types";

type Variant = "grid" | "rail" | "featured" | "related" | "mini" | "thumb";

const pixelFont = Silkscreen({ weight: "700", subsets: ["latin"] });

/** Stepped corners, so the badge reads as a sprite rather than a pill. */
const PIXEL_CORNERS =
  "polygon(0 4px,4px 4px,4px 0,calc(100% - 4px) 0,calc(100% - 4px) 4px,100% 4px,100% calc(100% - 4px),calc(100% - 4px) calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,4px calc(100% - 4px),0 calc(100% - 4px))";

/** [fill, highlight, edge, ink] for gold, silver, bronze, then everyone else. */
const RANK_COLORS = [
  ["#ffc928", "#fff1a8", "#a86a00", "#3d2600"],
  ["#d5dce5", "#ffffff", "#6f7a88", "#232a33"],
  ["#e08a4c", "#ffcfa3", "#7e3f15", "#2e1404"],
  ["#3f3f46", "#71717a", "#18181b", "#fafafa"],
];

function ordinal(n: number) {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${tail}`;
}

function RankBadge({ rank }: { rank: number }) {
  const [fill, highlight, edge, ink] = RANK_COLORS[rank - 1] ?? RANK_COLORS[3];
  return (
    <span className="absolute left-0 top-0 z-10 -translate-x-1/4 -translate-y-1/2">
      {/* Hops in two frames on hover, like a sprite. Drop-shadow, not box-shadow,
          because clip-path would cut a box-shadow off. */}
      <span
        className="relative flex flex-col items-center transition-transform duration-200 ease-[steps(2)] group-hover:-translate-y-1.5 motion-reduce:transition-none"
        style={{ filter: `drop-shadow(0 4px 0 ${edge}) drop-shadow(0 8px 10px rgb(0 0 0 / 0.3))` }}
      >
        {rank === 1 ? <PixelCrown color={fill} /> : null}
        <span
          className={cn(
            pixelFont.className,
            "flex items-center justify-center uppercase leading-none tracking-wide",
            rank === 1 ? "h-10 px-3.5 text-lg" : "h-8 px-2.5 text-sm",
          )}
          style={{
            clipPath: PIXEL_CORNERS,
            background: fill,
            color: ink,
            boxShadow: `inset 0 3px 0 ${highlight}, inset 0 -3px 0 ${edge}`,
          }}
        >
          {ordinal(rank)}
        </span>
      </span>
    </span>
  );
}

function PixelCrown({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 9 6" className="-mb-px h-[18px] w-[27px]" shapeRendering="crispEdges" aria-hidden fill={color}>
      <rect x="0" y="0" width="1" height="6" />
      <rect x="4" y="0" width="1" height="6" />
      <rect x="8" y="0" width="1" height="6" />
      <rect x="1" y="2" width="1" height="4" />
      <rect x="7" y="2" width="1" height="4" />
      <rect x="3" y="1" width="3" height="5" />
      <rect x="2" y="3" width="5" height="3" />
    </svg>
  );
}

export function GameCard({
  game,
  variant = "grid",
  priority = false,
  rank,
}: {
  game: Game;
  maxScore: number;
  variant?: Variant;
  priority?: boolean;
  rank?: number;
}) {
  const channel = channelPath(game.developer, game.channelHandle);

  if (variant === "related") {
    return (
      <article className="flex gap-2 rounded-lg p-1.5 -ml-1.5 hover:bg-surface-2">
        <Link
          href={gamePath(game)}
          className="relative h-[94px] w-[168px] shrink-0 overflow-hidden rounded-lg bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <GameThumb game={game} sizes="168px" />
        </Link>
        <div className="min-w-0 py-0.5">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">
            <Link
              href={gamePath(game)}
              className="text-text hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {game.title}
            </Link>
          </h3>
          <Link href={channel} className="mt-1 block truncate text-xs text-muted hover:text-text">
            {game.developer}
          </Link>
          <p className="mt-0.5 text-xs text-muted tabular-nums">{formatPlays(game.playCount)} plays</p>
        </div>
      </article>
    );
  }

  if (variant === "mini") {
    return (
      <article className="w-[140px] shrink-0 snap-start">
        <Link
          href={gamePath(game)}
          className="group relative block aspect-video overflow-hidden rounded-lg bg-surface-2"
        >
          <GameThumb game={game} sizes="140px" />
        </Link>
        <h3 className="mt-2 truncate text-caption font-medium">
          <Link href={gamePath(game)} className="text-text hover:text-text-muted">
            {game.title}
          </Link>
        </h3>
      </article>
    );
  }

  if (variant === "thumb") {
    return (
      <article className="block w-full">
        <Link href={gamePath(game)} className="group relative block">
          <span className="relative block aspect-video overflow-hidden rounded-panel bg-surface-2 transition-shadow duration-300 ease-out-quint group-hover:shadow-panel">
            <GameThumb game={game} priority={priority} sizes="(min-width: 768px) 280px, 100vw" />
            <Badges game={game} />
          </span>
          {rank ? (
            <RankBadge rank={rank} />
          ) : null}
        </Link>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
            <Link href={gamePath(game)} className="text-text hover:text-text-muted">
              {game.title}
            </Link>
          </h3>
          <LinkButton href={playHref(game)} variant="primary" size="sm" className="gap-1.5">
            <IconPlay className="h-3.5 w-3.5" />
            Play
          </LinkButton>
        </div>
        <p className="mt-0.5 truncate text-caption text-text-subtle tabular">
          {formatPlays(game.playCount)} plays
        </p>
      </article>
    );
  }

  if (variant === "featured") {
    return (
      <article className="relative grid gap-3 rounded-panel bg-surface-2 p-3 sm:gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
        <Link
          href={playHref(game)}
          aria-label={`Play ${game.title}`}
          className="group relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-surface md:aspect-auto md:h-[100px] md:w-[160px] lg:h-[112px] lg:w-[200px]"
        >
          <GameThumb
            game={game}
            priority={priority}
            sizes="(min-width: 768px) 200px, 100vw"
          />
          <Badges game={game} />
        </Link>
        <div className="flex min-w-0 flex-col justify-center gap-1 pr-16 md:pr-[4.75rem]">
          <h2 className="truncate text-title font-semibold tracking-tight">
            <Link
              href={gamePath(game)}
              className="text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {game.title}
            </Link>
          </h2>
          <Link href={channel} className="truncate text-caption text-muted hover:text-text">
            {game.developer}
          </Link>
          <Meta game={game} />
        </div>
        <LinkButton href={playHref(game)} variant="primary" size="sm" className="absolute right-3 top-3 z-10 gap-1.5">
          <IconPlay className="h-3.5 w-3.5" />
          Play
        </LinkButton>
      </article>
    );
  }

  const width = variant === "rail" ? "w-[260px] shrink-0 snap-start" : "w-full";

  return (
    <article className={`block ${width}`}>
      <Link
        href={gamePath(game)}
        className="group relative block aspect-video overflow-hidden rounded-panel bg-surface-2 transition-shadow duration-300 ease-out-quint hover:shadow-panel"
      >
        <GameThumb
          game={game}
          priority={priority}
          sizes={variant === "rail" ? "260px" : "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"}
        />
        <Badges game={game} />
      </Link>
      <div className="mt-3 min-w-0">
        <h3 className="truncate text-[15px] font-semibold tracking-tight">
          <Link
            href={gamePath(game)}
            className="text-text hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {game.title}
          </Link>
        </h3>
        <p className="mt-1 truncate text-caption text-text-subtle">
          <Link href={channel} className="hover:text-text">
            {game.developer}
          </Link>
          <span aria-hidden> · </span>
          <span className="tabular">{formatPlays(game.viewCount ?? 0)} views</span>
          <span aria-hidden> · </span>
          <span className="tabular">{formatPlays(game.playCount)} plays</span>
          <span aria-hidden> · </span>
          <span className="tabular">{formatPlays(game.likeCount)} likes</span>
        </p>
      </div>
    </article>
  );
}

function playHref(game: Game) {
  const base = gamePath(game);
  if (game.embeddable && game.playUrl) return `${base}?play=1`;
  return base;
}

function isNewThisWeek(iso: string) {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at < 7 * 86_400_000;
}

function NewThisWeekBadge({ createdAt }: { createdAt: string }) {
  if (!isNewThisWeek(createdAt)) return null;
  return (
    <span className="rounded-md bg-brand-blue px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-white uppercase">
      New
    </span>
  );
}

function PlayBadge({ game }: { game: Game }) {
  return (
    <span className="rounded-md bg-bg/75 px-1.5 py-0.5 text-badge font-medium uppercase tracking-wide text-text backdrop-blur-sm">
      {game.embeddable ? "Instant play" : "Web"}
    </span>
  );
}

function Badges({ game }: { game: Game }) {
  return (
    <div className="absolute bottom-2.5 left-2.5 flex flex-wrap items-center gap-1">
      <NewThisWeekBadge createdAt={game.createdAt} />
      <PlayBadge game={game} />
    </div>
  );
}

function Meta({ game }: { game: Game }) {
  return (
    <p className="mt-1.5 text-caption text-text-subtle">
      <span className="tabular">{formatPlays(game.viewCount ?? 0)} views</span>
      <span aria-hidden> · </span>
      <span className="tabular">{formatPlays(game.playCount)} plays</span>
      <span aria-hidden> · </span>
      <span className="tabular">{formatPlays(game.likeCount)} likes</span>
    </p>
  );
}
