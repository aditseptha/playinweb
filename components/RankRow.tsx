import Link from "next/link";
import { GameThumb } from "@/components/GameThumb";
import { IconPlay } from "@/components/icons";
import { LinkButton } from "@/components/ui/button";
import { formatPlays, gamePath } from "@/lib/format";
import type { Game } from "@/lib/types";

export function RankRow({
  game,
  rank,
}: {
  game: Game;
  rank: number;
  maxScore?: number;
}) {
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
