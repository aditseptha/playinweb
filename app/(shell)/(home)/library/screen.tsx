"use client";

import Link from "next/link";
import { TallCard } from "@/components/home/cards";
import s from "@/components/home/home.module.css";
import { HomeUiProvider } from "@/components/home/Peek";
import { cn } from "@/lib/cn";
import { apexHref } from "@/lib/host";
import { gamesByIds, historyGames, useGames } from "@/lib/store";
import type { Game } from "@/lib/types";

function GameShelf({ title, games }: { title: string; games: Game[] }) {
  return (
    <section className={s.librarySection} aria-label={title}>
      <div className={s.secHead}>
        <h2 className={s.secTitle}>{title}</h2>
      </div>
      <div className={s.grid}>
        {games.map((game, index) => (
          <TallCard key={game.id} game={game} i={index} reveal={false} />
        ))}
      </div>
    </section>
  );
}

export function LibraryScreen() {
  const { games, library, history } = useGames();
  const recent = historyGames(games, history);
  const saved = gamesByIds(games, library);

  return (
    <div className={s.create}>
      <div className={s.frame}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>You</p>
          <h1 className={s.createTitle}>Library</h1>
          <p className={s.legalIntro}>Games you played recently, and games you saved.</p>
          <HomeUiProvider>
            {recent.length > 0 ? <GameShelf title="Recently played" games={recent} /> : null}
            {saved.length > 0 ? (
              <GameShelf title="Saved games" games={saved} />
            ) : (
              <section className={s.librarySection} aria-label="Saved games">
                <div className={s.secHead}>
                  <h2 className={s.secTitle}>Saved games</h2>
                </div>
                <div className={s.manageEmpty}>
                  <p>Nothing saved yet</p>
                  <p className={s.legalIntro}>Open a game and save it. It will show up here.</p>
                  <Link href={apexHref("/")} className={cn(s.btn, s.btnPrimary)} style={{ marginTop: 18 }}>
                    Browse games
                  </Link>
                </div>
              </section>
            )}
          </HomeUiProvider>
        </div>
      </div>
    </div>
  );
}
