"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ds/button";
import { Illustration } from "@/components/ds/illustration";
import { focusRing, onArt } from "@/components/ds/styles";
import { GameThumb, PROJECT_STAGE_IMAGE_SIZES } from "@/components/GameThumb";
import { PreviewClip } from "@/components/PreviewClip";
import {
  IconClose,
  IconExpand,
  IconExternal,
  IconFullscreen,
  IconFullscreenExit,
  IconPlay,
  IconShrink,
} from "@/components/icons";
import { cn } from "@/lib/cn";
import { playFrameSize } from "@/lib/curation";
import { projectPublicUrl } from "@/lib/host";
import { GUEST_PLAY_LIMIT_MS } from "@/lib/guest-play";
import { playFrameSandbox } from "@/lib/html-game";
import { canOptimizeImage } from "@/lib/optimize-image";
import type { Game } from "@/lib/types";
import { vimeoThumbUrl, parseTrailer, type Trailer } from "@/lib/trailer";

// The game stage and its media strip. ProjectHeroRoot owns the play state; the stage, the strip,
// the Play card and the sticky Play bar read it through useProjectHero().
//
// One rule matters more than any style here: the game iframe is never moved to another parent.
// Moving it reloads the game and loses the player's progress. Wide view only changes the page grid,
// and the fallback fullscreen only changes CSS on the stage frame.

type Slide = { id: string; kind: "trailer" | "cover" | "shot" | "clip"; src?: string };

/** A game that hasn't signalled it loaded after this long gets the "didn't load" screen. */
const LOAD_TIMEOUT_MS = 25_000;

type HeroCtx = {
  game: Game;
  trailer: Trailer | null;
  slides: Slide[];
  slide: string;
  playing: boolean;
  expanded: boolean;
  current: Slide | undefined;
  canPlay: boolean;
  playLocked: boolean;
  /** Changes on Restart; keys the iframe so it reloads in place. */
  frameKey: number;
  onLoginRequest?: () => void;
  onSignupRequest?: () => void;
  onReport?: () => void;
  startPlay: () => void;
  /** Reloads the running game. Doesn't count another play or reset the guest timer. */
  restart: () => void;
  stop: () => void;
  shrink: () => void;
  expand: () => void;
  pickSlide: (id: string) => void;
};

const HeroContext = createContext<HeroCtx | null>(null);

export function useProjectHero() {
  const ctx = useContext(HeroContext);
  if (!ctx) throw new Error("ProjectHero parts need ProjectHeroRoot");
  return ctx;
}

export function ProjectHeroRoot({
  game,
  trailerUrl,
  autoPlay = false,
  allowPlay = true,
  playLocked = false,
  onLoginRequest,
  onSignupRequest,
  onReport,
  onDeniedPlay,
  onPlay,
  onExpandedChange,
  onPlayingChange,
  children,
}: {
  game: Game;
  trailerUrl?: string | null;
  autoPlay?: boolean;
  allowPlay?: boolean;
  playLocked?: boolean;
  onLoginRequest?: () => void;
  onSignupRequest?: () => void;
  onReport?: () => void;
  onDeniedPlay?: () => void;
  onPlay: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  onPlayingChange?: (playing: boolean) => void;
  children: ReactNode;
}) {
  const trailer = useMemo(() => parseTrailer(trailerUrl), [trailerUrl]);
  const [vimeoThumb, setVimeoThumb] = useState("");
  useEffect(() => {
    if (trailer?.provider !== "vimeo") return;
    let cancel = false;
    vimeoThumbUrl(trailer.id).then((url) => {
      if (!cancel && url) setVimeoThumb(url);
    });
    return () => {
      cancel = true;
    };
  }, [trailer]);
  const slides = useMemo<Slide[]>(
    () => [
      ...(game.previewClipUrl ? [{ id: "clip", kind: "clip" as const, src: game.thumbnailUrl }] : []),
      ...(trailer ? [{ id: "trailer", kind: "trailer" as const, src: vimeoThumb || trailer.thumbUrl }] : []),
      ...(game.thumbnailUrl ? [{ id: "cover", kind: "cover" as const, src: game.thumbnailUrl }] : []),
      ...game.screenshots.filter(Boolean).map((src, index) => ({
        id: `shot-${index}`,
        kind: "shot" as const,
        src,
      })),
    ],
    [trailer, vimeoThumb, game.thumbnailUrl, game.previewClipUrl, game.screenshots],
  );
  // Open on the cover when there is one: it's the poster for the Play button.
  const [slide, setSlide] = useState(slides.find((s) => s.kind === "cover")?.id ?? slides[0]?.id ?? "");
  const autoStart = autoPlay && game.embeddable && allowPlay;
  const [playing, setPlaying] = useState(!playLocked && autoPlay && game.embeddable);
  const [expanded, setExpanded] = useState(!playLocked && autoStart);
  const [frameKey, setFrameKey] = useState(0);
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
      slides,
      slide,
      playing,
      expanded,
      current,
      canPlay,
      playLocked,
      frameKey,
      onLoginRequest,
      onSignupRequest,
      onReport,
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
      restart() {
        setFrameKey((k) => k + 1);
      },
      stop() {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        setPlaying(false);
        setExpanded(false);
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
    }),
    [
      game,
      trailer,
      slides,
      slide,
      playing,
      expanded,
      current,
      canPlay,
      playLocked,
      frameKey,
      onLoginRequest,
      onSignupRequest,
      onReport,
      allowPlay,
      listingUrl,
      onDeniedPlay,
      onPlay,
    ],
  );

  return <HeroContext.Provider value={value}>{children}</HeroContext.Provider>;
}

function guestLimitLabel() {
  return GUEST_PLAY_LIMIT_MS >= 60_000
    ? `${Math.round(GUEST_PLAY_LIMIT_MS / 60_000)} minutes`
    : `${Math.round(GUEST_PLAY_LIMIT_MS / 1000)} seconds`;
}

const stageIconButton = cn(
  "relative inline-flex h-9 items-center gap-1.5 rounded-pw-pill px-3 text-pw-body-sm font-semibold text-pw-on-art transition-colors duration-150",
  "bg-[color-mix(in_srgb,var(--pw-night-950)_72%,transparent)] hover:bg-[color-mix(in_srgb,var(--pw-night-800)_90%,transparent)]",
  focusRing,
);

export function ProjectHeroStage() {
  const {
    game,
    trailer,
    playing,
    expanded,
    current,
    canPlay,
    playLocked,
    frameKey,
    onLoginRequest,
    onSignupRequest,
    onReport,
    startPlay,
    restart,
    stop,
    shrink,
    expand,
  } = useProjectHero();
  const stageRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Fallback for browsers without the Fullscreen API on elements (Safari on iPhone).
  const [pseudo, setPseudo] = useState(false);
  // Which frame (by frameKey) has finished loading, and which one timed out.
  const [loadedKey, setLoadedKey] = useState<number | null>(null);
  const [timedOutKey, setTimedOutKey] = useState<number | null>(null);
  const running = playing && game.embeddable && !playLocked;
  const loaded = loadedKey === frameKey;
  const timedOut = timedOutKey === frameKey && !loaded;

  useEffect(() => {
    function sync() {
      setFullscreen(document.fullscreenElement === stageRef.current);
    }
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const [prevLoadEpoch, setPrevLoadEpoch] = useState({ running, frameKey });
  if (running !== prevLoadEpoch.running || frameKey !== prevLoadEpoch.frameKey) {
    setPrevLoadEpoch({ running, frameKey });
    if (running) {
      setLoadedKey(null);
      setTimedOutKey(null);
    }
  }

  useEffect(() => {
    if (!running || loaded) return;
    const id = window.setTimeout(() => setTimedOutKey(frameKey), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [running, loaded, frameKey]);

  // Leaving the game also leaves the fallback fullscreen.
  const [prevRunning, setPrevRunning] = useState(running);
  if (running !== prevRunning) {
    setPrevRunning(running);
    if (!running) setPseudo(false);
  }

  useEffect(() => {
    if (!pseudo) return;
    const root = document.querySelector<HTMLElement>("[data-scroll-root]");
    const previous = root?.style.overflow ?? "";
    if (root) root.style.overflow = "hidden";
    // Esc only reaches the page when focus is outside the game, so the Exit button stays visible too.
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPseudo(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      if (root) root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [pseudo]);

  async function toggleFullscreen() {
    const node = stageRef.current;
    if (!node) return;
    if (pseudo) {
      setPseudo(false);
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (document.fullscreenEnabled && typeof node.requestFullscreen === "function") {
      try {
        await node.requestFullscreen();
        return;
      } catch {
        // Refused (or unsupported for this element): fall through to the CSS fallback.
      }
    }
    setPseudo(true);
  }

  async function collapse() {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    setPseudo(false);
    shrink();
  }

  const isFull = fullscreen || pseudo;
  const frameSize = playFrameSize(game.curated, game.playUrl);
  const poster = !current || current.kind === "cover" || current.kind === "shot";

  return (
    <div
      ref={stageRef}
      id="game-stage"
      className={cn(
        "project-stage dark relative flex flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pw-sky)_18%,transparent)] bg-pw-night-950 shadow-pw-3",
        pseudo
          ? "fixed inset-0 z-[100] rounded-none border-0 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
          : "rounded-[22px]",
      )}
    >
      <div className={cn("stage-media relative w-full overflow-hidden", pseudo ? "min-h-0 flex-1" : "aspect-video")}>
        {running ? (
          <>
            <PlayFrame
              key={frameKey}
              src={game.playUrl}
              title={game.title}
              size={frameSize}
              onLoad={() => setLoadedKey(frameKey)}
            />
            {timedOut ? (
              <StageScreen
                illustration="error"
                title="This game didn't load"
                body="It may be busy or offline. Try again in a moment."
                actions={
                  <>
                    <Button variant="primary" onClick={restart}>
                      Try again
                    </Button>
                    {onReport ? (
                      <Button variant="ghost" className="text-pw-on-art" onClick={onReport}>
                        Report a problem
                      </Button>
                    ) : null}
                  </>
                }
              />
            ) : !loaded ? (
              <LoadingScreen title={game.title} />
            ) : null}
          </>
        ) : current?.kind === "clip" && game.previewClipUrl ? (
          <ClipStage url={game.previewClipUrl} kind={game.previewClipKind ?? "video"} poster={game.thumbnailUrl} game={game} />
        ) : current?.kind === "trailer" && trailer ? (
          <iframe
            src={trailer.embedUrl}
            title={`${game.title} trailer`}
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : current?.src || game.thumbnailUrl ? (
          <>
            {current?.kind === "shot" && current.src ? <BlurBackdrop src={current.src} /> : null}
            <GameThumb
              game={game}
              src={current?.src}
              priority
              quality={90}
              sizes={PROJECT_STAGE_IMAGE_SIZES}
              fit={current?.kind === "shot" ? "contain" : "cover"}
            />
          </>
        ) : (
          <BrandedPlaceholder title={game.title} />
        )}

        {playLocked ? (
          <StageScreen
            illustration="sign-in"
            title="Sign in to keep playing"
            body={`Guests can play for ${guestLimitLabel()}. Sign in to keep playing.`}
            actions={
              <>
                {onSignupRequest ? (
                  <Button variant="primary" onClick={onSignupRequest}>
                    Sign up free
                  </Button>
                ) : null}
                {onLoginRequest ? (
                  <Button variant="secondary" onClick={onLoginRequest}>
                    Sign in
                  </Button>
                ) : null}
              </>
            }
          />
        ) : !running ? (
          <>
            {game.embeddable ? (
              <span
                className={cn(
                  "absolute top-3 left-3 z-10 inline-flex h-7 items-center gap-1.5 rounded-pw-pill px-2.5 text-pw-caption font-semibold",
                  "bg-[color-mix(in_srgb,var(--pw-night-950)_72%,transparent)]",
                  onArt,
                )}
              >
                <span aria-hidden className="size-1.5 rounded-full bg-pw-success" />
                Instant play
              </span>
            ) : null}
            {canPlay && poster ? (
              <>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[5] bg-[radial-gradient(60%_60%_at_50%_50%,color-mix(in_srgb,var(--pw-night-950)_35%,transparent),transparent_70%),linear-gradient(to_top,color-mix(in_srgb,var(--pw-night-950)_70%,transparent),transparent_45%)]"
                />
                <div className="absolute inset-0 z-10 grid place-items-center p-4">
                  {game.embeddable ? (
                    <button
                      type="button"
                      onClick={startPlay}
                      aria-label={`Play ${game.title}`}
                      className={cn("group flex flex-col items-center gap-2 rounded-pw-xl", focusRing)}
                    >
                      <span className="grid size-16 place-items-center rounded-full bg-linear-to-b from-pw-primary-hi to-pw-primary-lo text-pw-on-primary shadow-pw-glow transition-transform duration-150 ease-pw-out group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none md:size-[72px]">
                        <IconPlay aria-hidden className="ml-1 size-7" />
                      </span>
                      <span className={cn("text-pw-body font-bold", onArt)}>Play</span>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Button variant="primary" size="lg" onClick={startPlay}>
                        <IconPlay aria-hidden className="fill-current" />
                        Play
                        <IconExternal aria-hidden />
                      </Button>
                      <span className={cn("text-pw-body-sm", onArt)}>Opens in a new tab</span>
                    </div>
                  )}
                </div>
              </>
            ) : canPlay ? (
              // A clip or trailer is showing: keep it watchable and put Play in the corner.
              <div className="absolute right-3 bottom-3 z-10">
                <Button variant="primary" size="sm" onClick={startPlay}>
                  <IconPlay aria-hidden className="fill-current" />
                  {game.embeddable ? "Play game" : "Play"}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {running ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-[color-mix(in_srgb,var(--pw-sky)_12%,transparent)] bg-pw-night-900 px-3 py-2">
          <p className="mr-auto flex min-w-0 items-center gap-2 text-pw-body-sm text-pw-on-art">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-pw-success" />
            <span className="truncate">
              Playing <span className="font-semibold">{game.title}</span>
            </span>
          </p>
          {isFull ? null : (
            <button
              type="button"
              // Wide view only rearranges the lg grid, so below lg it has nothing to change.
              className={cn(stageIconButton, "max-lg:hidden")}
              onClick={() => (expanded ? void collapse() : expand())}
              aria-pressed={expanded}
            >
              {expanded ? <IconShrink aria-hidden className="size-4" /> : <IconExpand aria-hidden className="size-4" />}
              {expanded ? "Exit wide view" : "Wide view"}
            </button>
          )}
          <button type="button" className={stageIconButton} onClick={() => void toggleFullscreen()}>
            {isFull ? <IconFullscreenExit aria-hidden className="size-4" /> : <IconFullscreen aria-hidden className="size-4" />}
            <span className="max-sm:sr-only">{isFull ? "Exit fullscreen" : "Fullscreen"}</span>
          </button>
          <button type="button" className={stageIconButton} onClick={stop}>
            <IconClose aria-hidden className="size-4" />
            <span className="max-sm:sr-only">Exit</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** A screen over the stage: loading failed, guest limit reached. */
function StageScreen({
  illustration,
  title,
  body,
  actions,
}: {
  illustration: "error" | "sign-in";
  title: string;
  body: string;
  actions: ReactNode;
}) {
  return (
    <div
      role="status"
      className="absolute inset-0 z-20 grid place-items-center overflow-y-auto bg-[radial-gradient(70%_70%_at_50%_40%,color-mix(in_srgb,var(--pw-deep)_45%,var(--pw-night-950)),var(--pw-night-950))] p-4 text-center"
    >
      <div className="flex max-w-sm flex-col items-center gap-3">
        <Illustration name={illustration} size="s" className="max-sm:hidden" />
        <p className="font-pw-display text-[clamp(22px,3vw,30px)] leading-none font-extrabold text-pw-on-art uppercase italic">
          {title}
        </p>
        <p className="text-pw-body-sm text-pw-on-art-soft">{body}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

function LoadingScreen({ title }: { title: string }) {
  return (
    <div
      role="status"
      className="absolute inset-0 z-20 grid place-items-center bg-[radial-gradient(70%_70%_at_50%_45%,var(--pw-deep),var(--pw-night-950))] p-4 text-center"
    >
      <div className="flex w-full max-w-[240px] flex-col items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/playinweb-mark.webp" alt="" width={56} height={56} className="size-14 rounded-pw-lg" />
        <span aria-hidden className="relative h-1 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pw-white)_14%,transparent)]">
          <span className="pw-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-pw-primary" />
        </span>
        <p className="truncate text-pw-body-sm font-semibold text-pw-on-art">Loading {title}…</p>
      </div>
    </div>
  );
}

/** Game without a cover: its first letters on the brand gradient, never an empty box. */
function BrandedPlaceholder({ title }: { title: string }) {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center bg-linear-to-br from-pw-deep to-pw-navy">
      <span className="font-pw-display text-[clamp(64px,14vw,160px)] leading-none font-extrabold text-[color-mix(in_srgb,var(--pw-sky)_35%,transparent)] uppercase italic">
        {title.trim().slice(0, 2) || "PW"}
      </span>
    </div>
  );
}

/** Screenshots show whole (contain); a blurred copy of the same image fills the bars around them. */
function BlurBackdrop({ src }: { src: string }) {
  const className = "absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl";
  return canOptimizeImage(src) ? (
    <Image src={src} alt="" fill sizes="64px" className={className} aria-hidden />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden className={className} />
  );
}

export function ProjectHeroThumbs() {
  const { game, slides, slide, playing, pickSlide } = useProjectHero();
  if (slides.length <= 1) return null;
  const index = Math.max(0, slides.findIndex((s) => s.id === slide));

  let shot = 0;
  return (
    <div className="flex items-center gap-3">
      <div className="scrollbar-hide -m-1 flex min-w-0 flex-1 gap-2 overflow-x-auto p-1">
        {slides.map((item) => {
          const label =
            item.kind === "clip"
              ? "Preview clip"
              : item.kind === "trailer"
                ? "Trailer"
                : item.kind === "cover"
                  ? "Cover"
                  : `Screenshot ${++shot}`;
          const selected = slide === item.id && !playing;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => pickSlide(item.id)}
              aria-label={label}
              aria-pressed={selected}
              className={cn(
                "relative aspect-video w-24 shrink-0 overflow-hidden rounded-[10px] border border-pw-line bg-pw-surface-3 transition-[box-shadow,opacity] duration-150",
                selected
                  ? "ring-2 ring-pw-primary ring-offset-2 ring-offset-pw-bg"
                  : "opacity-80 hover:opacity-100",
                focusRing,
              )}
            >
              {item.kind === "trailer" && item.src ? (
                // YouTube thumbnail host isn't in images.remotePatterns, so it stays a plain <img>.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : item.src ? (
                <GameThumb game={game} src={item.src} sizes="96px" fit="cover" />
              ) : (
                <span className="absolute inset-0 bg-pw-surface-3" />
              )}
              {item.kind === "trailer" || item.kind === "clip" ? (
                <span className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--pw-night-950)_35%,transparent)]">
                  <span className="grid size-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--pw-night-950)_75%,transparent)] text-pw-white">
                    <IconPlay aria-hidden className="ml-0.5 size-3.5" />
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="shrink-0 text-pw-caption text-pw-muted tabular-nums max-sm:hidden" aria-hidden>
        {index + 1} / {slides.length}
      </p>
    </div>
  );
}

function ClipStage({
  url,
  kind,
  poster,
  game,
}: {
  url: string;
  kind: "video" | "gif";
  poster: string;
  game: Parameters<typeof GameThumb>[0]["game"];
}) {
  const [on, setOn] = useState(false);
  if (!on) {
    return (
      <button type="button" className={cn("absolute inset-0", focusRing)} onClick={() => setOn(true)} aria-label="Play preview">
        <GameThumb game={game} src={poster} sizes={PROJECT_STAGE_IMAGE_SIZES} />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--pw-night-950)_75%,transparent)] text-pw-white">
            <IconPlay aria-hidden className="ml-0.5 size-5" />
          </span>
        </span>
      </button>
    );
  }
  return (
    <div className="absolute inset-0">
      <PreviewClip url={url} kind={kind} />
      <button type="button" className={cn(stageIconButton, "absolute top-3 right-3 z-10")} onClick={() => setOn(false)}>
        Pause
      </button>
    </div>
  );
}

/**
 * The game iframe. Most games fill the stage. An embed player with a fixed size (PICO-8) renders at
 * that size and is scaled to fit, centred, because it lays out badly at any other size.
 */
function embedFrameLooksReady(iframe: HTMLIFrameElement) {
  try {
    const doc = iframe.contentDocument;
    return Boolean(doc && doc.readyState === "complete");
  } catch {
    return false;
  }
}

function PlayFrame({
  src,
  title,
  size,
  onLoad,
}: {
  src: string;
  title: string;
  size: { width: number; height: number } | null;
  onLoad: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const reported = useRef(false);
  const [scale, setScale] = useState(1);

  const notifyLoaded = useCallback(() => {
    if (reported.current) return;
    reported.current = true;
    onLoad();
  }, [onLoad]);

  useEffect(() => {
    reported.current = false;
  }, [src]);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el) return;

    const handleLoad = () => notifyLoaded();
    const catchUp = () => {
      if (embedFrameLooksReady(el)) notifyLoaded();
    };

    el.addEventListener("load", handleLoad);
    catchUp();
    // Fast embeds (itch.io) can finish before React attaches `onLoad`, especially after hydration.
    const soon = window.setTimeout(catchUp, 0);
    const remoteEmbed = /^https?:\/\//i.test(src);
    const backup = remoteEmbed ? window.setTimeout(catchUp, 250) : undefined;
    // Cross-origin embeds may not expose `contentDocument`; don't block play behind the spinner forever.
    const reveal = remoteEmbed ? window.setTimeout(() => notifyLoaded(), 4_000) : undefined;

    return () => {
      el.removeEventListener("load", handleLoad);
      window.clearTimeout(soon);
      if (backup !== undefined) window.clearTimeout(backup);
      if (reveal !== undefined) window.clearTimeout(reveal);
    };
  }, [src, notifyLoaded]);

  useEffect(() => {
    const box = boxRef.current;
    if (!size || !box) return;
    const fit = () => setScale(Math.min(box.clientWidth / size.width, box.clientHeight / size.height) || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [size]);

  const frame = (
    <iframe
      ref={iframeRef}
      src={src}
      title={title}
      className={cn("border-0 bg-pw-night-950", size ? "absolute top-1/2 left-1/2" : "absolute inset-0 h-full w-full")}
      style={
        size
          ? { width: size.width, height: size.height, transform: `translate(-50%, -50%) scale(${scale})` }
          : undefined
      }
      allow="fullscreen; gamepad; accelerometer; autoplay; pointer-lock; clipboard-write"
      allowFullScreen
      sandbox={playFrameSandbox()}
      onLoad={notifyLoaded}
    />
  );
  return size ? (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden">
      {frame}
    </div>
  ) : (
    frame
  );
}
