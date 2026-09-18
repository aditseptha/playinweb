"use client";

import { GameThumb } from "@/components/GameThumb";
import type { Game } from "@/lib/types";

export function GameCover({ game }: { game: Game }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-panel bg-surface">
      <GameThumb game={game} />
    </div>
  );
}
