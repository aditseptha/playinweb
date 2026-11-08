"use client";

import { ArrowRight, Heart, Play, Plus, Sparkles, Star, Users } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { playHref } from "@/components/GameCard";
import { GameThumb } from "@/components/GameThumb";
import { isNewThisWeek } from "@/components/home/filters";
import s from "@/components/home/home.module.css";
import { usePeek } from "@/components/home/Peek";
import { cn } from "@/lib/cn";
import { formatPlays, gamePath } from "@/lib/format";
import { apexHref } from "@/lib/host";
import type { Game } from "@/lib/types";

const indexStyle = (i: number) => ({ "--i": i }) as CSSProperties;

function canTilt() {
  return (
    window.matchMedia("(min-width: 768px) and (hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function PlayButton({ game }: { game: Game }) {
  return (
    <Link href={playHref(game)} className={s.play} aria-label={`Play ${game.title}`}>
      <Play className={s.ic} />
    </Link>
  );
}

function Art({ game, priority, sizes }: { game: Game; priority?: boolean; sizes: string }) {
  return (
    <div className={s.art} aria-hidden>
      <GameThumb game={game} priority={priority} sizes={sizes} />
    </div>
  );
}

/** Large landscape card for the featured row. */
export function FeatureCard({ game, i = 0, priority = false }: { game: Game; i?: number; priority?: boolean }) {
  const peek = usePeek(game);
  return (
    <article className={cn(s.card, s.cOrig, s.rv)} style={indexStyle(i)} {...peek}>
      <Art game={game} priority={priority} sizes="(min-width: 1024px) 30vw, (min-width: 768px) 48vw, 92vw" />
      <Link href={gamePath(game)} className={s.hit} aria-label={game.title} />
      {game.embeddable ? <span className={s.pill}>Instant play</span> : null}
      <div className={s.glass}>
        <div className={s.gText}>
          <div className={s.gTitle}>{game.title}</div>
          <div className={s.meta}>
            <span className={s.who}>{game.developer}</span>
            <span>
              <Users className={cn(s.ic, s.xs)} /> <b className={s.tnum}>{formatPlays(game.playCount)}</b>
            </span>
            {game.likeCount > 0 ? (
              <span>
                <Heart className={cn(s.ic, s.xs, s.goldIc)} /> <b className={s.tnum}>{formatPlays(game.likeCount)}</b>
              </span>
            ) : null}
          </div>
        </div>
        <PlayButton game={game} />
      </div>
    </article>
  );
}

/** Portrait card with a pointer tilt and shine. */
export function TallCard({
  game,
  i = 0,
  badge,
  reveal = true,
  priority = false,
}: {
  game: Game;
  i?: number;
  badge?: "new" | "top" | null;
  reveal?: boolean;
  priority?: boolean;
}) {
  const peek = usePeek(game);
  const label = badge === undefined ? (isNewThisWeek(game.createdAt) ? "new" : null) : badge;

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!canTilt()) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.classList.add(s.tilting);
    el.style.setProperty("--ry", `${((px - 0.5) * 12).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - py) * 10).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
  };
  const onLeave = (e: ReactPointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.classList.remove(s.tilting);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    peek.onPointerLeave();
  };

  return (
    <article
      className={cn(s.card, s.cTall, reveal && s.rv)}
      style={indexStyle(i)}
      {...peek}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <Art game={game} priority={priority} sizes="(min-width: 1181px) 15vw, (min-width: 768px) 24vw, 46vw" />
      <span className={s.shine} />
      <Link href={gamePath(game)} className={s.hit} aria-label={game.title} />
      {label ? <span className={cn(s.badge, label === "top" && s.badgeTop)}>{label === "top" ? "TOP" : "NEW"}</span> : null}
      {game.likeCount > 0 ? (
        <span className={s.rate}>
          <Heart className={s.ic} /> <span className={s.tnum}>{formatPlays(game.likeCount)}</span>
        </span>
      ) : null}
      <div className={s.tTitle}>{game.title}</div>
      <div className={s.tMeta}>
        {game.developer} · {formatPlays(game.playCount)} plays
      </div>
    </article>
  );
}

/** Wide landscape card for a tag row. */
export function WideCard({ game, i = 0 }: { game: Game; i?: number }) {
  const peek = usePeek(game);
  return (
    <article className={cn(s.card, s.cFolk, s.rv)} style={indexStyle(i)} {...peek}>
      <Art game={game} sizes="(min-width: 1024px) 30vw, (min-width: 768px) 48vw, 92vw" />
      <Link href={gamePath(game)} className={s.hit} aria-label={game.title} />
      <div className={s.fText}>
        <div className={s.fTitle}>{game.title}</div>
        <div className={s.fMeta}>
          {game.developer} · {formatPlays(game.playCount)} plays
        </div>
      </div>
      <PlayButton game={game} />
    </article>
  );
}

const HEX_SIDES: [number, string][] = [
  [-60, "#f2a62c"],
  [-120, "#f2a62c"],
  [0, "#d9891b"],
  [180, "#d9891b"],
  [60, "#b5680d"],
  [120, "#b5680d"],
];

/** "Your turn" card that invites creators to publish while the catalogue is small. */
export function SlotCard({ slot }: { slot: number }) {
  return (
    <div className={cn(s.slot, s.rv)} style={indexStyle(slot - 1)}>
      <span className={s.slotLbl}>SLOT {String(slot).padStart(2, "0")}</span>
      <span className={s.spark} style={{ top: 46, left: 28 }}>
        <Sparkles className={cn(s.ic, s.sm)} />
      </span>
      <span className={s.spark} style={{ top: 34, right: 40 }}>
        <Star className={cn(s.ic, s.xs)} />
      </span>
      <span className={s.spark} style={{ top: 96, left: 26 }}>
        <Star className={cn(s.ic, s.xs)} />
      </span>
      <span className={cn(s.spark, s.sparkViolet)} style={{ top: 92, right: 26 }}>
        <Sparkles className={cn(s.ic, s.xs)} />
      </span>
      <span className={s.hexWrap} aria-hidden>
        <span className={s.hex3d}>
          {HEX_SIDES.map(([a, c]) => (
            <i key={a} className={s.hexSide} style={{ "--a": `${a}deg`, "--c": c } as CSSProperties} />
          ))}
          <span className={s.hexFace}>
            <Plus className={s.ic} />
          </span>
          <span className={cn(s.hexFace, s.hexBack)}>
            <Plus className={s.ic} />
          </span>
        </span>
      </span>
      <h4>Your turn!</h4>
      <p>Publish your first game</p>
      <Link href={apexHref("/register")} className={cn(s.btn, s.btnPrimary)}>
        Publish <ArrowRight className={cn(s.ic, s.xs)} />
      </Link>
    </div>
  );
}
