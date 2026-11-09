"use client";

import { IconCloudOff, IconHistory, IconPlus } from "@/components/icons";
import Link from "next/link";
import { GameThumb } from "@/components/GameThumb";
import { useLoginDialog } from "@/components/LoginDialog";
import { useSignupDialog } from "@/components/SignupDialog";
import { timeAgo } from "@/components/home/filters";
import s from "@/components/home/home.module.css";
import { cn } from "@/lib/cn";
import { formatPlays, gamePath } from "@/lib/format";
import { apexHref } from "@/lib/host";
import type { Game } from "@/lib/types";

/** Signed-out banner. The card on the right lists recent plays kept on this device, or popular games. */
export function GuestBanner({ recent, popular }: { recent: { game: Game; at: number }[]; popular: Game[] }) {
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  const rows = recent.length > 0 ? recent.slice(0, 2) : popular.slice(0, 2).map((game) => ({ game, at: 0 }));

  return (
    <section className={cn(s.guest, s.onDark, s.revealSelf)} aria-labelledby="guest-title">
      <div>
        <div className={s.pixEyebrow}>Playing as a guest</div>
        <h2 id="guest-title">Make PlayInWeb yours</h2>
        <p>Sign in or sign up free to like games, follow the creators you enjoy, and publish games of your own.</p>
        <div className={s.guestCta}>
          <button type="button" className={cn(s.btn, s.btnWhite)} onClick={() => openLogin()}>
            Sign in
          </button>
          <button type="button" className={cn(s.btn, s.btnGhost)} onClick={() => openSignup()}>
            Sign up free
          </button>
        </div>
      </div>
      {rows.length > 0 ? (
        <div className={s.recent}>
          <div className={s.recentCard}>
            <div className={s.recentHead}>
              <IconHistory className={cn(s.ic, s.sm)} />
              {recent.length > 0 ? "Recently played" : "Popular right now"}
              {recent.length > 0 ? (
                <span className={s.pillWarn}>
                  <IconCloudOff className={cn(s.ic, s.xs)} />
                  This device only
                </span>
              ) : null}
            </div>
            {rows.map(({ game, at }) => (
              <Link key={game.id} href={gamePath(game)} className={s.recentRow}>
                <span className={s.recentThumb}>
                  <GameThumb game={game} sizes="48px" ratio="portrait" />
                </span>
                <span>
                  <span className={s.rTop}>
                    <span className={s.rTitle}>{game.title}</span>
                  </span>
                  <span className={s.rMeta}>
                    {at ? `Played ${timeAgo(at)}` : `${game.developer} · ${formatPlays(game.playCount)} plays`}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Orange "make your first game" banner for signed-in users while the catalogue is small. */
export function CreatorCTA({ games }: { games: Game[] }) {
  return (
    <section className={cn(s.cta, s.revealSelf)} aria-labelledby="cta-title">
      <div>
        <div className={cn(s.pixEyebrow, s.pixPlain)}>Become a creator</div>
        <h2 id="cta-title">Got a story? Make your first game</h2>
        <p>Publishing is free. Upload an HTML build and it&apos;s playable in the browser right away.</p>
        <div className={s.ctaBtns}>
          <Link href={apexHref("/register")} className={cn(s.btn, s.btnInk)}>
            <IconPlus className={cn(s.ic, s.sm)} />
            Start a game
          </Link>
          <Link href={apexHref("/manage")} className={cn(s.btn, s.btnGlassO)}>
            Manage your games
          </Link>
        </div>
      </div>
      {games.length > 0 ? (
        <div className={s.thumbs} aria-hidden>
          {games.slice(0, 3).map((game) => (
            <div key={game.id} className={s.thumb}>
              <GameThumb game={game} sizes="122px" ratio="portrait" />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
