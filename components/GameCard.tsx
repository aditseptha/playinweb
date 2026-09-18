import Link from "next/link";
import { GameThumb } from "@/components/GameThumb";
import { channelPath, formatPlays, gamePath } from "@/lib/format";
import type { Game } from "@/lib/types";

type Variant = "grid" | "rail" | "featured" | "related" | "promo" | "mini";

export function GameCard({
  game,
  maxScore: _maxScore,
  variant = "grid",
  priority = false,
}: {
  game: Game;
  maxScore: number;
  variant?: Variant;
  priority?: boolean;
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

  if (variant === "promo") {
    return (
      <article className="w-[232px] shrink-0 snap-start">
        <Link
          href={gamePath(game)}
          className="group block overflow-hidden rounded-2xl bg-[#16181d] shadow-[0_12px_28px_-16px_oklch(0_0_0_/_0.55)]"
        >
          <div className="relative aspect-[16/10] bg-surface-2">
            <GameThumb game={game} priority={priority} sizes="232px" />
            {isNewThisWeek(game.createdAt) ? (
              <span className="absolute left-2.5 top-2.5 rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-white uppercase">
                New this week
              </span>
            ) : null}
            <span className="absolute bottom-2.5 left-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white tabular">
              {formatPlays(game.playCount)} plays
            </span>
          </div>
          <h3 className="truncate px-3 py-3 text-[15px] font-semibold tracking-tight text-white">
            {game.title}
          </h3>
        </Link>
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

  if (variant === "featured") {
    return (
      <article className="grid overflow-hidden rounded-panel bg-surface md:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)]">
        <Link href={gamePath(game)} className="group relative aspect-[16/9] bg-surface-2 md:aspect-auto md:min-h-[112px]">
          <GameThumb
            game={game}
            priority={priority}
            sizes="(min-width: 768px) 200px, 100vw"
          />
          <Badges game={game} />
        </Link>
        <div className="flex min-w-0 flex-col justify-center gap-1 px-4 py-3 md:px-5">
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
          <p className="mt-0.5 line-clamp-1 text-caption text-text-subtle">{game.description}</p>
          <Meta game={game} />
        </div>
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

function Badges({ game }: { game: Game }) {
  return (
    <>
      <span className="absolute left-2.5 top-2.5 rounded-md bg-accent px-1.5 py-0.5 text-badge font-semibold uppercase text-accent-fg">
        Free
      </span>
      {game.embeddable ? (
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-bg/75 px-1.5 py-0.5 text-badge font-medium uppercase tracking-wide text-text backdrop-blur-sm">
          Play in browser
        </span>
      ) : (
        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-bg/75 px-1.5 py-0.5 text-badge font-medium uppercase tracking-wide text-text backdrop-blur-sm">
          Web
        </span>
      )}
    </>
  );
}

function isNewThisWeek(iso: string) {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at < 7 * 86_400_000;
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
