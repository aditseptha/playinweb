import Link from "next/link";
import { GameThumb } from "@/components/GameThumb";
import { formatPlays, formatScore, gamePath } from "@/lib/format";
import { popularityScore } from "@/lib/popularity";
import type { Game } from "@/lib/types";

export function RankRow({
  game,
  rank,
  maxScore,
}: {
  game: Game;
  rank: number;
  maxScore: number;
}) {
  const score = popularityScore(game);
  const pct = Math.min(100, (score / maxScore) * 100);
  const podium = rank <= 3;

  return (
    <Link
      href={gamePath(game)}
      className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-none px-4 py-3 hover:bg-surface-2 sm:grid-cols-[3rem_160px_minmax(0,1fr)_auto]"
    >
      <span
        className={`text-center text-lg font-bold tabular-nums ${podium ? "text-accent" : "text-muted"}`}
      >
        {rank}
      </span>
      <div className="relative hidden aspect-video overflow-hidden rounded-lg bg-surface sm:block">
        <GameThumb game={game} sizes="160px" />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-medium text-text">{game.title}</h3>
        <p className="truncate text-sm text-muted">{game.developer}</p>
      </div>
      <div className="flex flex-col items-end gap-1 text-right">
        <span className="text-sm tabular-nums text-text">{formatPlays(game.playCount)} plays</span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="tabular-nums">{formatScore(score)}</span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </span>
        </span>
      </div>
    </Link>
  );
}
