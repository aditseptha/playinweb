import { GameCard } from "@/components/GameCard";
import type { Game } from "@/lib/types";

export function GameGrid({ games, maxScore }: { games: Game[]; maxScore: number }) {
  if (games.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {games.map((game) => (
        <GameCard key={game.id} game={game} maxScore={maxScore} />
      ))}
    </div>
  );
}
