"use client";

import Link from "next/link";
import { GameThumb } from "@/components/GameThumb";
import { useLoginDialog } from "@/components/LoginDialog";
import { useSignupDialog } from "@/components/SignupDialog";
import { pixelFont } from "@/components/home/fonts";
import { IconPlus } from "@/components/icons";
import { cn } from "@/lib/cn";
import { apexHref } from "@/lib/host";
import type { Game } from "@/lib/types";

const TILTS = ["-rotate-[10deg] translate-y-3", "z-10 -translate-y-2", "rotate-[9deg] translate-y-3"];

/** Three tilted covers, the art on the right of both banners. */
function CardFan({ games, size }: { games: Game[]; size: "sm" | "lg" }) {
  if (games.length === 0) return null;
  return (
    <div className="pointer-events-none hidden shrink-0 items-center md:flex" aria-hidden>
      {games.slice(0, 3).map((game, i) => (
        <div
          key={game.id}
          className={cn(
            "relative -ml-6 overflow-hidden rounded-2xl border-[3px] border-white/85 bg-surface-2 shadow-[0_18px_40px_-12px_oklch(0%_0_0/0.55)] first:ml-0",
            size === "sm" ? "h-[104px] w-[78px]" : "h-[150px] w-[112px]",
            TILTS[i],
          )}
        >
          <GameThumb game={game} sizes="120px" />
        </div>
      ))}
    </div>
  );
}

export function SignInBanner({ games }: { games: Game[] }) {
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(110deg,oklch(58%_0.21_262)_0%,oklch(57%_0.22_282)_55%,oklch(60%_0.22_300)_100%)] px-6 py-6 text-white shadow-[0_24px_60px_-24px_oklch(55%_0.22_275/0.7)] sm:px-8">
      <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-bold tracking-tight sm:text-[26px]">Sign in to get more out of it</h2>
          <p className="mt-1.5 max-w-[60ch] text-body text-white/85 sm:text-[15px]">
            Like games, follow the creators you enjoy, and publish games of your own.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openLogin()}
            className="inline-flex h-11 items-center rounded-full bg-white px-6 text-[15px] font-semibold text-[oklch(22%_0.04_282)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => openSignup()}
            className="inline-flex h-11 items-center rounded-full border border-white/35 bg-white/15 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/25"
          >
            Sign up free
          </button>
        </div>
        <CardFan games={games} size="sm" />
      </div>
    </section>
  );
}

export function CreatorBanner({ games }: { games: Game[] }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(105deg,oklch(80%_0.16_75)_0%,oklch(73%_0.18_55)_60%,oklch(68%_0.19_38)_100%)] px-6 py-7 text-[oklch(20%_0.05_282)] shadow-[0_24px_60px_-24px_oklch(70%_0.18_55/0.7)] sm:px-9 sm:py-9">
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <p className={cn(pixelFont.className, "text-[11px] uppercase tracking-[0.14em] text-[oklch(28%_0.06_282)]")}>
            Become a creator
          </p>
          <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight sm:text-[36px]">
            Got a story? Make your first game
          </h2>
          <p className="mt-2 max-w-[62ch] text-[15px] text-[oklch(26%_0.05_282)] sm:text-[16px]">
            Publishing is free. Upload an HTML build and it&apos;s playable in the browser right away.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={apexHref("/register")}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[oklch(19%_0.05_282)] px-6 text-[16px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <IconPlus className="h-4 w-4" />
              Start a game
            </Link>
            <Link
              href={apexHref("/manage")}
              className="inline-flex h-12 items-center rounded-2xl border border-[oklch(20%_0.05_282/0.25)] bg-white/25 px-6 text-[16px] font-semibold transition-colors hover:bg-white/40"
            >
              Manage your games
            </Link>
          </div>
        </div>
        <CardFan games={games} size="lg" />
      </div>
    </section>
  );
}
