"use client";

import { IconArrow, IconHeart, IconKeyboard, IconPlay, IconPlus, IconSpark, IconStar, IconUsers } from "@/components/icons";
import Link from "next/link";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { playHref } from "@/components/GameCard";
import { GameThumb } from "@/components/GameThumb";
import { LinkPending } from "@/components/ds/link-pending";
import { PreviewClip, useCardClip } from "@/components/PreviewClip";
import { isNewThisWeek } from "@/components/home/filters";
import s from "@/components/home/home.module.css";
import { usePeek } from "@/components/home/Peek";
import { useTouchDevice } from "@/components/home/useTouchDevice";
import { cn } from "@/lib/cn";
import { formatPlays, gamePath } from "@/lib/format";
import { needsDesktop } from "@/lib/device";
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
      <IconPlay className={s.ic} />
    </Link>
  );
}

function Art({
  game,
  priority,
  sizes,
  ratio = "landscape",
}: {
  game: Game;
  priority?: boolean;
  sizes: string;
  ratio?: "landscape" | "portrait";
}) {
  return (
    <div className={s.art} aria-hidden>
      <GameThumb game={game} priority={priority} sizes={sizes} ratio={ratio} />
    </div>
  );
}

/** On a phone, marks a game that needs a keyboard or gamepad, so nobody taps into one by surprise (#47). */
function DesktopTag({ game }: { game: Game }) {
  const touch = useTouchDevice();
  if (!touch || !needsDesktop(game.controls)) return null;
  return (
    <span className={s.deskTag}>
      <IconKeyboard className={cn(s.ic, s.xs)} />
      Best on desktop
    </span>
  );
}

function PausePreview({ onPause }: { onPause: () => void }) {
  return (
    <button
      type="button"
      className={s.clipPause}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onPause();
      }}
    >
      Pause
    </button>
  );
}

/** Large landscape card for the featured row. */
export function FeatureCard({ game, i = 0, priority = false }: { game: Game; i?: number; priority?: boolean }) {
  const peek = usePeek(game);
  const clip = useCardClip(game.previewClipUrl);
  return (
    <article
      className={cn(s.card, s.cOrig, s.rv)}
      style={indexStyle(i)}
      {...peek}
      onPointerEnter={(event) => {
        peek.onPointerEnter(event);
        clip.onEnter();
      }}
      onPointerLeave={() => {
        peek.onPointerLeave();
        clip.onLeave();
      }}
    >
      <Art game={game} priority={priority} sizes="(min-width: 1024px) 30vw, (min-width: 768px) 48vw, 92vw" />
      {clip.playing && game.previewClipUrl ? (
        <PreviewClip url={game.previewClipUrl} kind={game.previewClipKind ?? "video"} onDisplace={clip.pause} />
      ) : null}
      {clip.playing ? <PausePreview onPause={clip.pause} /> : null}
      <Link href={gamePath(game)} className={s.hit} aria-label={game.title}>
        <LinkPending />
      </Link>
      {game.embeddable ? <span className={s.pill}>Instant play</span> : null}
      <div className={s.glass}>
        <div className={s.gText}>
          <DesktopTag game={game} />
          <div className={s.gTitle}>{game.title}</div>
          <div className={s.meta}>
            <span className={s.who}>{game.developer}</span>
            <span>
              <IconUsers className={cn(s.ic, s.xs)} /> <b className={s.tnum}>{formatPlays(game.playCount)}</b>
            </span>
            {game.likeCount > 0 ? (
              <span>
                <IconHeart className={cn(s.ic, s.xs, s.goldIc)} /> <b className={s.tnum}>{formatPlays(game.likeCount)}</b>
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
      <Art game={game} priority={priority} sizes="(min-width: 1181px) 15vw, (min-width: 768px) 24vw, 46vw" ratio="portrait" />
      <span className={s.shine} />
      <Link href={gamePath(game)} className={s.hit} aria-label={game.title}>
        <LinkPending />
      </Link>
      {label ? <span className={cn(s.badge, label === "top" && s.badgeTop)}>{label === "top" ? "TOP" : "NEW"}</span> : null}
      {game.likeCount > 0 ? (
        <span className={s.rate}>
          <IconHeart className={s.ic} /> <span className={s.tnum}>{formatPlays(game.likeCount)}</span>
        </span>
      ) : null}
      <DesktopTag game={game} />
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
  const clip = useCardClip(game.previewClipUrl);
  return (
    <article
      className={cn(s.card, s.cFolk, s.rv)}
      style={indexStyle(i)}
      {...peek}
      onPointerEnter={(event) => {
        peek.onPointerEnter(event);
        clip.onEnter();
      }}
      onPointerLeave={() => {
        peek.onPointerLeave();
        clip.onLeave();
      }}
    >
      <Art game={game} sizes="(min-width: 1024px) 30vw, (min-width: 768px) 48vw, 92vw" />
      {clip.playing && game.previewClipUrl ? (
        <PreviewClip url={game.previewClipUrl} kind={game.previewClipKind ?? "video"} onDisplace={clip.pause} />
      ) : null}
      {clip.playing ? <PausePreview onPause={clip.pause} /> : null}
      <Link href={gamePath(game)} className={s.hit} aria-label={game.title}>
        <LinkPending />
      </Link>
      <div className={s.fText}>
        <DesktopTag game={game} />
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
        <IconSpark className={cn(s.ic, s.sm)} />
      </span>
      <span className={s.spark} style={{ top: 34, right: 40 }}>
        <IconStar className={cn(s.ic, s.xs)} />
      </span>
      <span className={s.spark} style={{ top: 96, left: 26 }}>
        <IconStar className={cn(s.ic, s.xs)} />
      </span>
      <span className={cn(s.spark, s.sparkViolet)} style={{ top: 92, right: 26 }}>
        <IconSpark className={cn(s.ic, s.xs)} />
      </span>
      <span className={s.hexWrap} aria-hidden>
        <span className={s.hex3d}>
          {HEX_SIDES.map(([a, c]) => (
            <i key={a} className={s.hexSide} style={{ "--a": `${a}deg`, "--c": c } as CSSProperties} />
          ))}
          <span className={s.hexFace}>
            <IconPlus className={s.ic} />
          </span>
          <span className={cn(s.hexFace, s.hexBack)}>
            <IconPlus className={s.ic} />
          </span>
        </span>
      </span>
      <h4>Your turn!</h4>
      <p>Publish your first game</p>
      <Link href={apexHref("/register")} className={cn(s.btn, s.btnPrimary)}>
        Publish <IconArrow className={cn(s.ic, s.xs)} />
      </Link>
    </div>
  );
}
