"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { GameGrid } from "@/components/GameGrid";
import { gamesByIds, useGames } from "@/lib/store";
import { maxPopularity } from "@/lib/popularity";

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const { games, collections } = useGames();
  const collection = collections.find((c) => c.id === id);
  const max = maxPopularity(games);

  if (!collection) notFound();

  const listed = gamesByIds(games, collection.gameIds);

  return (
    <div className="min-w-0 pt-4">
      <p className="text-sm text-muted">
        <Link href="/library" className="hover:text-text">
          Library
        </Link>
        <span aria-hidden> · </span>
        Collection
      </p>
      <h1 className="mt-1 text-display font-semibold tracking-tight">{collection.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {listed.length} {listed.length === 1 ? "game" : "games"}
      </p>
      {listed.length === 0 ? (
        <div className="mt-10 rounded-panel bg-surface-2 px-5 py-12 text-center">
          <p className="font-medium">No games yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Add games from a listing with Add to collection.
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
