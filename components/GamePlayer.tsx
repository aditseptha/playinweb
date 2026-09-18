"use client";

import { useState } from "react";
import { GameThumb } from "@/components/GameThumb";
import { IconExternal, IconPlay } from "@/components/icons";
import { projectPublicUrl } from "@/lib/host";
import { playFrameSandbox } from "@/lib/html-game";
import type { Game } from "@/lib/types";

export function GamePlayer({
  game,
  onPlay,
}: {
  game: Game;
  onPlay: () => void;
}) {
  const [started, setStarted] = useState(false);

  function startEmbed() {
    if (game.channelHandle && game.projectSlug) {
      window.location.assign(`${projectPublicUrl(game.channelHandle, game.projectSlug)}?play=1`);
      return;
    }
    setStarted(true);
    onPlay();
  }

  function openExternal() {
    onPlay();
    window.open(game.playUrl, "_blank", "noopener,noreferrer");
  }

  if (game.embeddable && started) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-panel bg-bg-inset">
        <iframe
          src={game.playUrl}
          title={game.title}
          className="absolute inset-0 h-full w-full border-0"
          allow="fullscreen; gamepad; accelerometer; autoplay; pointer-lock; clipboard-write"
          allowFullScreen
          sandbox={playFrameSandbox()}
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-panel bg-surface">
      <GameThumb game={game} />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 grid place-items-center p-6">
        {game.embeddable ? (
          <button
            type="button"
            onClick={startEmbed}
            className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-fg shadow-panel transition-transform duration-150 hover:scale-105 hover:bg-accent-hover active:scale-95"
            aria-label={`Play ${game.title}`}
          >
            <IconPlay className="h-7 w-7 translate-x-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={openExternal}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-3.5 text-body font-medium text-accent-fg shadow-panel hover:bg-accent-hover sm:h-9"
          >
            <IconExternal className="h-4 w-4" />
            Play in new tab
          </button>
        )}
      </div>
    </div>
  );
}
