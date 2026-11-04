"use client";

import Image from "next/image";
import Link from "next/link";
import { playHref } from "@/components/GameCard";
import { excerpt } from "@/components/home/filters";
import { pixelDisplayFont, pixelFont } from "@/components/home/fonts";
import { IconBookmark, IconChevron, IconPlay, IconPlus } from "@/components/icons";
import { isAdminEmail } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { navItemVisible, useFeatures } from "@/lib/features";
import { apexHref } from "@/lib/host";
import { canOptimizeImage } from "@/lib/optimize-image";
import { useGames } from "@/lib/store";
import type { Game } from "@/lib/types";

const FALLBACK_ART = "/home-hero.webp";

const PRIMARY =
  "inline-flex h-12 items-center gap-2 rounded-2xl bg-home-primary px-6 text-[16px] font-semibold text-white shadow-[0_0_0_1px_oklch(100%_0_0/0.2)_inset,0_12px_32px_-10px_var(--home-primary)] transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.98] sm:h-14 sm:px-7 sm:text-[17px]";
const SECONDARY =
  "inline-flex h-12 items-center gap-2 rounded-2xl border border-white/15 bg-[oklch(20%_0.04_282/0.7)] px-6 text-[16px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-[oklch(26%_0.05_282/0.8)] sm:h-14 sm:px-7 sm:text-[17px]";

function HeroArt({ src }: { src: string }) {
  const className = "object-cover object-[70%_40%]";
  return canOptimizeImage(src) ? (
    <Image src={src} alt="" fill preload sizes="100vw" className={className} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cn("absolute inset-0 h-full w-full", className)} />
  );
}

/**
 * Full-bleed spotlight under the top bar. Until the admin can pick a game of the week,
 * it spotlights the most played game; with no games it introduces the site instead.
 */
export function FeaturedHero({ game }: { game: Game | null }) {
  const { library, toggleLibrary } = useGames();
  const { user } = useAuth();
  const { features, loading } = useFeatures();
  const rankings = navItemVisible("/top", features, isAdminEmail(user?.email), loading);
  const saved = game ? library.includes(game.id) : false;
  const art = game?.thumbnailUrl?.trim() || FALLBACK_ART;
  const tag = game?.tags[0];

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
      <div className="absolute inset-0 -z-10" aria-hidden>
        <HeroArt src={art} />
        {/* Left scrim keeps the copy readable; the bottom fade hands off to the page colour in either theme. */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(13%_0.04_282/0.94)_0%,oklch(13%_0.04_282/0.72)_38%,oklch(13%_0.04_282/0.15)_70%,transparent_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
      </div>

      <div className="home-force-dark mx-auto max-w-[1600px] px-4 pb-16 pt-[112px] sm:px-6 sm:pt-[124px] lg:px-8 lg:pb-20">
        <div className="max-w-[640px] border-l-4 border-home-amber pl-5 sm:pl-6">
          <p className={cn(pixelFont.className, "text-[11px] uppercase tracking-[0.14em] text-home-amber sm:text-[12px]")}>
            {game ? (tag ? `Featured game · ${tag}` : "Featured game") : "Indie games in your browser"}
          </p>
          <h1
            id="hero-title"
            className={cn(
              pixelDisplayFont.className,
              "mt-3 text-[38px] font-bold uppercase leading-[1] tracking-[0.02em] text-white [text-shadow:0_4px_0_oklch(0%_0_0/0.5)] sm:text-[54px] lg:text-[68px]",
            )}
          >
            {game ? game.title : "Play indie games"}
          </h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-white/85 sm:text-[17px]">
            {game
              ? excerpt(game.description) || `A ${tag ?? "browser"} game by ${game.developer}. Open it and play, nothing to install.`
              : "Story and adventure games from indie creators. Pick one and play, nothing to install."}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
          {game ? (
            <>
              <Link href={playHref(game)} className={PRIMARY}>
                <IconPlay className="h-5 w-5" />
                Play now
              </Link>
              <button
                type="button"
                onClick={() => toggleLibrary(game.id)}
                aria-pressed={saved}
                className={SECONDARY}
              >
                <IconBookmark className={cn("h-5 w-5", saved && "fill-current")} />
                {saved ? "Saved" : "Save"}
              </button>
            </>
          ) : (
            <Link href={apexHref("/register")} className={PRIMARY}>
              <IconPlus className="h-5 w-5" />
              Publish the first game
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto -mt-10 flex h-8 max-w-[1600px] justify-end px-4 pb-4 sm:px-6 lg:px-8">
        {rankings ? (
        <Link
          href={apexHref("/top")}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-ui font-semibold text-text transition-colors hover:text-text-muted"
        >
          See the rankings
          <IconChevron className="h-4 w-4" />
        </Link>
        ) : null}
      </div>
    </section>
  );
}
