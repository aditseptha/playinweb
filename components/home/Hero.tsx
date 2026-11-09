"use client";

import { IconBookmark, IconPlay, IconPlus } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { playHref } from "@/components/GameCard";
import s from "@/components/home/home.module.css";
import { useHomeUi } from "@/components/home/Peek";
import { cn } from "@/lib/cn";
import { formatPlays } from "@/lib/format";
import { apexHref } from "@/lib/host";
import { objectPosition } from "@/lib/media-standard";
import { canOptimizeImage } from "@/lib/optimize-image";
import { useGames } from "@/lib/store";
import type { Game } from "@/lib/types";

const FALLBACK_ART = "/home-hero.webp";

// Fireflies sit at fixed positions so server and client render the same markup.
const FLIES = Array.from({ length: 14 }, (_, k) => ({
  l: 50 + ((k * 37) % 46),
  t: 28 + ((k * 53) % 58),
  d: 6 + (k % 5) * 1.4,
  dl: -(k * 0.9),
  x: (k % 2 ? 1 : -1) * (10 + ((k * 7) % 28)),
}));

/**
 * Spotlight with fog and fireflies over the featured game's cover. Until the admin can
 * pick a game of the week (PR 2), it spotlights the most played game.
 */
export function Hero({ game }: { game: Game | null }) {
  const { library } = useGames();
  const { toggleSave } = useHomeUi();
  const saved = game ? library.includes(game.id) : false;
  const art = game?.thumbnailUrl?.trim() || FALLBACK_ART;
  const focus = objectPosition(game?.focalX, game?.focalY);
  const tag = game?.tags[0];

  return (
    <section className={cn(s.hero, s.onDark)} aria-labelledby="hero-title">
      <div className={s.heroArtWrap} aria-hidden>
        {canOptimizeImage(art) ? (
          <Image src={art} alt="" fill preload sizes="(max-width: 767px) 100vw, 62vw" className={s.heroArt} style={{ objectPosition: focus }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" className={s.heroArt} style={{ objectPosition: focus }} />
        )}
      </div>
      <div className={s.fog} aria-hidden />
      <div className={cn(s.fog, s.fog2)} aria-hidden />
      <div className={s.flies} aria-hidden>
        {FLIES.map((f, k) => (
          <i
            key={k}
            className={s.fly}
            style={{ left: `${f.l}%`, top: `${f.t}%`, "--d": `${f.d}s`, "--dl": `${f.dl}s`, "--x": `${f.x}px` } as CSSProperties}
          />
        ))}
      </div>
      <div className={s.frame}>
        <div className={cn(s.wrap, s.heroBody)}>
          <div className={s.eyebrow}>{game ? `Featured game${tag ? ` · ${tag}` : ""}` : "Indie games in your browser"}</div>
          <h1 id="hero-title" className={s.heroTitle}>
            {game ? game.title : "Play indie games"}
          </h1>
          <div className={s.heroSub}>
            {game ? `By ${game.developer} · ${formatPlays(game.playCount)} plays` : "Nothing to install"}
          </div>
          <div className={s.heroCta}>
            {game ? (
              <>
                <Link href={playHref(game)} className={cn(s.btn, s.btnPrimary)}>
                  <IconPlay className={s.ic} />
                  Play now
                </Link>
                <button type="button" className={cn(s.btn, s.btnDark)} aria-pressed={saved} onClick={() => toggleSave(game)}>
                  <IconBookmark className={cn(s.ic, saved && s.saved)} filled={saved} />
                  {saved ? "Saved" : "Save"}
                </button>
              </>
            ) : (
              <Link href={apexHref("/register")} className={cn(s.btn, s.btnPrimary)}>
                <IconPlus className={s.ic} />
                Publish the first game
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
