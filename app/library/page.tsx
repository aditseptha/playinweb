"use client";

import Link from "next/link";
import { GameGrid } from "@/components/GameGrid";
import { gamesByIds, useGames } from "@/lib/store";
import { maxPopularity } from "@/lib/popularity";

export default function LibraryPage() {
  const { games, library } = useGames();
  const listed = gamesByIds(games, library);
  const max = maxPopularity(games);

  return (
    <div className="mx-auto min-w-0 max-w-[1400px]">
      <h1 className="text-display font-semibold tracking-tight">Library</h1>
      <p className="mt-1.5 text-body text-text-muted">Games you saved from a listing.</p>
      {listed.length === 0 ? (
        <div className="mt-10 rounded-panel bg-surface px-5 py-12 text-center">
          <p className="font-medium">Save a game from its page</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Open any listing and tap Save to library. It will show up here.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-surface-2 px-3.5 text-body font-medium hover:bg-surface-3"
          >
            Browse games
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <GameGrid games={listed} maxScore={max} />
        </div>
      )}
    </div>
  );
}
