"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GameThumb } from "@/components/GameThumb";
import { Button } from "@/components/ui/button";
import { IconExpand, IconFullscreen, IconFullscreenExit, IconPlay, IconShrink } from "@/components/icons";
import { cn } from "@/lib/cn";
import { formatPlays } from "@/lib/format";
import { projectPublicUrl } from "@/lib/host";
import { GUEST_PLAY_LIMIT_MS } from "@/lib/guest-play";
import { playFrameSandbox } from "@/lib/html-game";
import type { Game } from "@/lib/types";
import { parseTrailer, type Trailer } from "@/lib/trailer";

type Slide = { id: string; kind: "trailer" | "image"; src?: string };

type HeroCtx = {
  game: Game;
  trailer: Trailer | null;
  tags: string[];
  playLabel?: string;
  playCount: number;
  liked: boolean;
  slides: Slide[];
  slide: string;
  playing: boolean;
  expanded: boolean;
  current: Slide | undefined;
  canPlay: boolean;
  playLocked: boolean;
  onLoginRequest?: () => void;
  startPlay: () => void;
  shrink: () => void;
  expand: () => void;
  pickSlide: (id: string) => void;
  onLike: () => void;
};

const HeroContext = createContext<HeroCtx | null>(null);

function useHero() {
  const ctx = useContext(HeroContext);
  if (!ctx) throw new Error("ProjectHero parts need ProjectHeroRoot");
  return ctx;
}

export function ProjectHeroRoot({
  game,
  trailerUrl,
  tags,
  playLabel,
  playCount,
  liked,
  autoPlay = false,
  allowPlay = true,
  playLocked = false,
  onLoginRequest,
  onDeniedPlay,
  onPlay,
  onExpandedChange,
  onPlayingChange,
  onLike,
  children,
}: {
  game: Game;
  trailerUrl?: string | null;
  tags: string[];
  playLabel?: string;
  playCount?: number;
  liked: boolean;
  autoPlay?: boolean;
  allowPlay?: boolean;
  playLocked?: boolean;
  onLoginRequest?: () => void;
  onDeniedPlay?: () => void;
  onPlay: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  onPlayingChange?: (playing: boolean) => void;
  onLike: () => void;
  children: ReactNode;
}) {
  const trailer = parseTrailer(trailerUrl);
  const shots = unique([game.thumbnailUrl, ...game.screenshots].filter(Boolean));
  const slides: Slide[] = [
    ...(trailer ? [{ id: "trailer", kind: "trailer" as const, src: trailer.thumbUrl }] : []),
    ...shots.map((src) => ({ id: src, kind: "image" as const, src })),
  ];
  const [slide, setSlide] = useState(slides.find((s) => s.kind === "image")?.id ?? slides[0]?.id ?? "");
  const [playing, setPlaying] = useState(autoPlay && game.embeddable);
  const [expanded, setExpanded] = useState(autoPlay && game.embeddable);
  const current = slides.find((s) => s.id === slide) ?? slides[0];
  const canPlay = Boolean(game.playUrl);
  const listingUrl =
    game.channelHandle && game.projectSlug ? projectPublicUrl(game.channelHandle, game.projectSlug) : "";

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  useEffect(() => {
    if (!autoPlay || !game.embeddable || !allowPlay) return;
    setPlaying(true);
    setExpanded(true);
  }, [allowPlay, autoPlay, game.embeddable]);

  useEffect(() => {
    onPlayingChange?.(playing);
  }, [onPlayingChange, playing]);

  useEffect(() => {
    if (!playLocked) return;
    setPlaying(false);
    setExpanded(false);
  }, [playLocked]);

  const value = useMemo<HeroCtx>(
    () => ({
      game,
      trailer,
      tags,
      playLabel,
      playCount: playCount ?? game.playCount,
      liked,
      slides,
      slide,
      playing,
      expanded,
      current,
      canPlay,
      playLocked,
      onLoginRequest,
      startPlay() {
        if (!canPlay) return;
        if (!allowPlay) {
          onDeniedPlay?.();
          return;
        }
        if (game.embeddable) {
          const here = `${window.location.origin}${window.location.pathname}`.replace(/\/$/, "");
          const canonical = listingUrl.replace(/\/$/, "");
          if (canonical && here !== canonical) {
            window.location.assign(`${listingUrl}?play=1`);
            return;
          }
          setPlaying(true);
          setExpanded(true);
        }
        onPlay();
      },
      shrink() {
        setExpanded(false);
      },
      expand() {
        setExpanded(true);
      },
      pickSlide(id: string) {
        setPlaying(false);
        setExpanded(false);
        setSlide(id);
      },
      onLike,
    }),
    [
      game,
      trailer,
      tags,
      playLabel,
      playCount,
      liked,
      slides,
      slide,
      playing,
      expanded,
      current,
      canPlay,
      playLocked,
      onLoginRequest,
      allowPlay,
      listingUrl,
      onDeniedPlay,
      onPlay,
      onLike,
    ],
  );

  return <HeroContext.Provider value={value}>{children}</HeroContext.Provider>;
}

export function ProjectHeroStage() {
  const {
    game,
    trailer,
    tags,
    playLabel,
    playCount,
    playing,
    expanded,
    current,
    canPlay,
    playLocked,
    onLoginRequest,
    startPlay,
    shrink,
    expand,
  } = useHero();
  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    function sync() {
      setFullscreen(document.fullscreenElement === stageRef.current);
    }
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  async function toggleFullscreen() {
    const node = stageRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await node.requestFullscreen();
  }

  async function collapse() {
    if (document.fullscreenElement) await document.exitFullscreen();
    shrink();
  }

  return (
    <div
      ref={stageRef}
      className="project-stage relative aspect-video overflow-hidden rounded-panel bg-bg-inset"
    >
      {playing && game.embeddable && !playLocked ? (
        <iframe
          src={game.playUrl}
          title={game.title}
          className="absolute inset-0 h-full w-full border-0"
          allow="fullscreen; gamepad; accelerometer; autoplay; pointer-lock; clipboard-write"
          allowFullScreen
          sandbox={playFrameSandbox()}
        />
      ) : current?.kind === "trailer" && trailer ? (
        <iframe
          src={trailer.embedUrl}
          title={`${game.title} trailer`}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <GameThumb game={game} src={current?.src} />
      )}

      {tags.length > 0 && !playing ? (
        <ul className="absolute left-3 top-3 z-10 flex max-w-[70%] flex-wrap gap-1.5">
          {tags.slice(0, 4).map((tag) => (
            <li key={tag} className="rounded-md bg-bg/75 px-2 py-0.5 text-badge font-medium uppercase text-text">
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {playing ? (
        <div className="absolute right-3 top-3 z-10 flex gap-1.5">
          <Button
            variant="secondary"
            size="icon-sm"
            className="bg-bg/75"
            onClick={() => (expanded ? void collapse() : expand())}
            aria-label={expanded ? "Exit wide view" : "Wide view"}
          >
            {expanded ? <IconShrink className="h-3.5 w-3.5" /> : <IconExpand className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            className="bg-bg/75"
            onClick={() => void toggleFullscreen()}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <IconFullscreenExit className="h-3.5 w-3.5" /> : <IconFullscreen className="h-3.5 w-3.5" />}
          </Button>
        </div>
      ) : null}

      {playLocked ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-bg/85 p-6 backdrop-blur-sm">
          <div className="max-w-sm text-center">
            <p className="text-heading font-semibold">Sign in to keep playing</p>
            <p className="mt-2 text-body text-text-muted">
              Guest play is limited to{" "}
              {GUEST_PLAY_LIMIT_MS >= 60_000
                ? `${Math.round(GUEST_PLAY_LIMIT_MS / 60_000)} minutes`
                : `${Math.round(GUEST_PLAY_LIMIT_MS / 1000)} seconds`}
              . Create an account or sign in to continue.
            </p>
            {onLoginRequest ? (
              <Button type="button" variant="primary" className="mt-5" onClick={onLoginRequest}>
                Sign in
              </Button>
            ) : null}
          </div>
        </div>
      ) : !playing ? (
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-end gap-2 bg-gradient-to-t from-bg/70 to-transparent p-3 pt-12 sm:p-4">
          {canPlay ? (
            <button
              type="button"
              onClick={startPlay}
              className="group flex items-center gap-2.5 rounded-full border-2 border-white/90 bg-transparent py-1 pl-1 pr-3"
            >
              <span className="flex h-7 translate-y-0 items-center gap-1.5 rounded-full bg-[#4CADFF] px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_3px_0_#2a7ac8] group-hover:bg-[#3d9ef0] group-active:translate-y-[2px] group-active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_1px_0_#2a7ac8]">
                {playLabel ?? "Play"}
                <IconPlay className="h-3 w-3 translate-x-px" />
              </span>
              <span className="whitespace-nowrap pr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                Played <span className="tabular">{formatPlays(playCount)}</span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProjectHeroThumbs() {
  const { game, slides, slide, playing, pickSlide } = useHero();
  if (slides.length <= 1) return null;

  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto p-1">
      {slides.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => pickSlide(item.id)}
          className={cn(
            "relative aspect-video h-16 shrink-0 overflow-hidden rounded-lg bg-surface-2",
            slide === item.id && !playing ? "outline outline-2 outline-offset-2 outline-accent" : "",
          )}
          aria-label={item.kind === "trailer" ? "Trailer" : "Screenshot"}
        >
          {item.kind === "trailer" && item.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : item.kind === "image" ? (
            <GameThumb game={game} src={item.src} />
          ) : (
            <span className="absolute inset-0 bg-surface-3" />
          )}
          {item.kind === "trailer" ? (
            <span className="absolute inset-0 grid place-items-center bg-bg/35">
              <IconPlay className="h-4 w-4 text-text" />
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function unique(items: string[]) {
  return [...new Set(items)];
}
