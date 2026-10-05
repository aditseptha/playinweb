"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GameThumb, PROJECT_STAGE_IMAGE_SIZES } from "@/components/GameThumb";
import { Button } from "@/components/ui/button";
import { IconExpand, IconFullscreen, IconFullscreenExit, IconPlay, IconShrink } from "@/components/icons";
import { cn } from "@/lib/cn";
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
  const trailer = useMemo(() => parseTrailer(trailerUrl), [trailerUrl]);
  const slides = useMemo<Slide[]>(
    () => [
      ...(trailer ? [{ id: "trailer", kind: "trailer" as const, src: trailer.thumbUrl }] : []),
      ...unique([game.thumbnailUrl, ...game.screenshots].filter(Boolean)).map((src) => ({
        id: src,
        kind: "image" as const,
        src,
      })),
    ],
    [trailer, game.thumbnailUrl, game.screenshots],
  );
  const [slide, setSlide] = useState(slides.find((s) => s.kind === "image")?.id ?? slides[0]?.id ?? "");
  const autoStart = autoPlay && game.embeddable && allowPlay;
  const [playing, setPlaying] = useState(!playLocked && autoPlay && game.embeddable);
  const [expanded, setExpanded] = useState(!playLocked && autoStart);
  const [prevAutoStart, setPrevAutoStart] = useState(autoStart);
  const [prevPlayLocked, setPrevPlayLocked] = useState(playLocked);
  if (autoStart !== prevAutoStart) {
    setPrevAutoStart(autoStart);
    if (autoStart) {
      setPlaying(true);
      setExpanded(true);
    }
  }
  if (playLocked !== prevPlayLocked) {
    setPrevPlayLocked(playLocked);
    if (playLocked) {
      setPlaying(false);
      setExpanded(false);
    }
  }
  const current = slides.find((s) => s.id === slide) ?? slides[0];
  const canPlay = Boolean(game.playUrl);
  const listingUrl =
    game.channelHandle && game.projectSlug ? projectPublicUrl(game.channelHandle, game.projectSlug) : "";

  useEffect(() => {
    onExpandedChange?.(expanded);
  }, [expanded, onExpandedChange]);

  useEffect(() => {
    onPlayingChange?.(playing);
  }, [onPlayingChange, playing]);

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
            // Hard navigation: the canonical listing lives on the apex origin, which may differ from this host.
            const url = new URL(listingUrl);
            url.searchParams.set("play", "1");
            window.location.assign(url.href);
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
        <GameThumb
          game={game}
          src={current?.src}
          priority
          quality={90}
          sizes={PROJECT_STAGE_IMAGE_SIZES}
        />
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
            // Wide view only rearranges the lg grid, so below lg the button has
            // nothing to change. Hidden rather than inert so it isn't dead UI.
            className="bg-bg/75 max-lg:hidden"
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
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[30%] bg-[linear-gradient(to_top,oklch(0_0_0/0.78)_0%,oklch(0_0_0/0.38)_55%,transparent_100%)]"
          />
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-end gap-2 p-3 sm:p-4">
            {canPlay ? (
              <button
                type="button"
                onClick={startPlay}
                className="group relative inline-flex h-[50px] select-none items-center overflow-hidden rounded-full border border-[#005bc4] bg-brand-blue pl-6 pr-12 text-sm font-bold uppercase tracking-[0.08em] text-white outline-none [text-shadow:0_1px_0_rgb(0_0_0/0.3)] shadow-[inset_0_30px_30px_-15px_rgb(255_255_255/0.1),inset_0_0_0_1px_rgb(255_255_255/0.3),0_3px_0_#005bc4,0_3px_2px_rgb(0_0_0/0.2),0_5px_10px_rgb(0_0_0/0.1),0_10px_20px_rgb(0_0_0/0.1)] transition-all duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-white active:translate-y-[3px] active:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.15),inset_0_1px_20px_rgb(0_0_0/0.1),0_0_0_#005bc4,0_0_0_2px_rgb(255_255_255/0.5)]"
              >
                <span className="transition-all duration-500 ease-in-out group-hover:translate-x-[160px] motion-reduce:transition-none">
                  {playLabel ?? "Play"}
                </span>
                <IconPlay className="absolute right-6 h-4 w-4 transition-all duration-500 ease-in-out group-hover:right-1/2 group-hover:translate-x-1/2 group-hover:scale-150 motion-reduce:transition-none" />
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ProjectHeroGrid({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 grid-cols-1">{children}</div>;
}

export function ProjectHeroTitle({ children }: { children: ReactNode }) {
  const { slides } = useHero();
  return (
    <h1 className={cn(slides.length > 1 ? "mt-6" : "mt-3", "text-display font-semibold")}>{children}</h1>
  );
}

export function ProjectHeroThumbs() {
  const { game, slides, slide, playing, pickSlide } = useHero();
  if (slides.length <= 1) return null;

  return (
    <div className="scrollbar-hide mt-2 flex gap-2 overflow-x-auto p-1">
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
            // YouTube thumbnail host isn't in images.remotePatterns, so it stays a plain <img>.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : item.kind === "image" ? (
            <GameThumb game={game} src={item.src} sizes="128px" />
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
