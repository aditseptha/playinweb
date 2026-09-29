"use client";

import { GameThumb, PROJECT_STAGE_IMAGE_SIZES } from "@/components/GameThumb";
import type { Game } from "@/lib/types";

export function GameCover({ game }: { game: Game }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-panel bg-surface">
      <GameThumb game={game} quality={90} sizes={PROJECT_STAGE_IMAGE_SIZES} />
    </div>
  );
}
