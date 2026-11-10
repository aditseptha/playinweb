"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { TallCard } from "@/components/home/cards";
import { Button } from "@/components/ds/button";
import { EmptyState } from "@/components/ds/empty-state";
import s from "@/components/home/home.module.css";
import { HomeUiProvider } from "@/components/home/Peek";
import { apexHref } from "@/lib/host";
import { gamesByIds, useGames } from "@/lib/store";

export function CollectionScreen() {
  const { id } = useParams<{ id: string }>();
  const { games, collections } = useGames();
  const collection = collections.find((c) => c.id === id);

  if (!collection) notFound();

  const listed = gamesByIds(games, collection.gameIds);

  return (
    <div className={s.create}>
      <div className={s.frame}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>You</p>
          <h1 className={s.createTitle}>{collection.name}</h1>
          <p className={s.legalIntro}>
            <Link href={apexHref("/library")}>Library</Link>
            <span aria-hidden> · </span>
            {listed.length} {listed.length === 1 ? "game" : "games"}
          </p>
          {listed.length === 0 ? (
            <EmptyState
              kind="user"
              illustration="empty-library"
              title="No games yet"
              body="Add games from a listing with Add to collection."
              action={
                <Button variant="primary" asChild>
                  <Link href={apexHref("/")}>Browse games</Link>
                </Button>
              }
            />
          ) : (
            <HomeUiProvider>
              <div className={s.grid} style={{ marginTop: 28 }}>
                {listed.map((game, index) => (
                  <TallCard key={game.id} game={game} i={index} reveal={false} />
                ))}
              </div>
            </HomeUiProvider>
          )}
        </div>
      </div>
    </div>
  );
}
