"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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
  IconBookmark,
  IconGamepad,
  IconKeyboard,
  IconPhone,
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
import { onLeaveFullscreen } from "@/lib/fullscreen";

// The game stage and its media strip. ProjectHeroRoot owns the play state; the stage, the strip,
// the Play card and the sticky Play bar read it through useProjectHero().
//
// One rule matters more than any style here: the game iframe is never moved to another parent.
// Moving it reloads the game and loses the player's progress. Wide view only changes the page grid,
// and the fallback fullscreen only changes CSS on the stage frame.

type Slide = { id: string; kind: "trailer" | "cover" | "shot" | "clip"; src?: string };

/** A game that hasn't signalled it loaded after this long gets the "didn't load" screen. */
const LOAD_TIMEOUT_MS = 25_000;

// Phones and small tablets. A coarse pointer keeps a resized desktop window out of this.
const PHONE_PLAY = "(pointer: coarse) and (max-width: 1024px)";
const PHONE_PLAY_EVENT = "playinweb:phone-play";

function isPhonePlay() {
  return typeof window !== "undefined" && window.matchMedia(PHONE_PLAY).matches;
}

function subscribePhonePlay(onChange: () => void) {
  const query = window.matchMedia(PHONE_PLAY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Whether a ?play=1 link may start the game by itself (#38). Not on a phone: a game started without
 * a tap can't go fullscreen there, so the phone waits for the player to tap Play. Not during the server
 * render either, which can't tell a phone from a computer; the game starts right after hydration.
 */
export function useAutoPlayAllowed() {
  return useSyncExternalStore(subscribePhonePlay, () => !isPhonePlay(), () => false);
}

const PORTRAIT = "(orientation: portrait)";

function subscribePortrait(onChange: () => void) {
  const query = window.matchMedia(PORTRAIT);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The screen is taller than it is wide right now. */
function usePortraitScreen() {
  return useSyncExternalStore(subscribePortrait, () => window.matchMedia(PORTRAIT).matches, () => false);
}

// The DOM typings dropped ScreenOrientation.lock while browsers disagree on it; only Chrome on Android
// honours it, and only in fullscreen.
type Lockable = { lock?: (orientation: "portrait" | "landscape") => Promise<void>; unlock?: () => void };

function lockOrientation(orientation: "portrait" | "landscape") {
  const screenOrientation = (typeof screen !== "undefined" ? screen.orientation : undefined) as Lockable | undefined;
  return screenOrientation?.lock?.(orientation).catch(() => {});
}

function unlockOrientation() {
  try {
    ((typeof screen !== "undefined" ? screen.orientation : undefined) as Lockable | undefined)?.unlock?.();
  } catch {
    // Not locked, or not supported.
  }
}

/**
 * Same-origin games (DesKop) pin Sautan and the main button with position:fixed. A transform on
 * <html> does not hold those buttons inside an iframe, so they land under the phone screen and
 * get clipped. A transform on <body> does.
 *
 * `flush` drops the game's own bottom safe-area. The player bar already sits on the screen edge,
 * so that padding would leave a gap under the game's cards.
 *
 * DesKop also sizes the map with 100vh. On a phone that is the whole screen, taller than this
 * frame, so the village panel (anchored to the map bottom) slides down behind the role cards.
 */
function lockFrameLayout(iframe: HTMLIFrameElement, on: boolean, flush: boolean) {
  try {
    const doc = iframe.contentDocument;
    const root = doc?.documentElement;
    const body = doc?.body;
    if (!doc || !root || !body) return;
    root.style.height = on ? "100%" : "";
    root.style.overflow = on ? "hidden" : "";
    root.style.transform = "";
    root.style.paddingBottom = on && flush ? "0px" : "";
    body.style.position = on ? "relative" : "";
    body.style.height = on ? "100%" : "";
    body.style.overflow = on ? "hidden" : "";
    // A 2D transform keeps position:fixed inside the frame. translateZ would put the
    // game canvas on a 3D layer that paints over the buttons while they stay clickable.
    body.style.transform = on ? "translate(0px, 0px)" : "";
    let fit = doc.getElementById("pw-frame-fit");
    if (on && flush) {
      if (!fit) {
        fit = doc.createElement("style");
        fit.id = "pw-frame-fit";
        doc.head.appendChild(fit);
      }
      fit.textContent = [
        ".bar,.homesheet,.mbox,.lfoot,.qz{padding-bottom:8px !important}",
        "#world,#hud,#labels{height:100% !important;max-height:100% !important}",
      ].join("");
      body.style.removeProperty("--mapH");
    } else {
      fit?.remove();
      body.style.removeProperty("--mapH");
      doc.querySelectorAll<HTMLElement>(".hud-bot").forEach((el) => {
        el.style.bottom = "";
      });
    }
  } catch {
    // A cross-origin embed can't be restyled. Fullscreen still gives it the whole screen.
  }
}

/**
 * DesKop inserts the action bar inside #app, and #app scrolls. Once the frame contains
 * position:fixed, that scroll clips the bar's pixels, so Sautan and Ketok palu stay
 * clickable and disappear. The bar belongs on the document, above the cards.
 */
function liftActionBar(doc: Document) {
  const app = doc.getElementById("app");
  const fresh = app?.querySelector<HTMLElement>(".bar");
  if (!fresh) return;
  doc.querySelectorAll<HTMLElement>(".bar").forEach((el) => {
    if (el !== fresh) el.remove();
  });
  if (fresh.parentElement !== doc.body) doc.body.appendChild(fresh);
}

/** Keep Desaku above the role cards after DesKop's own dock measurement goes stale. */
function placeVillagePanel(iframe: HTMLIFrameElement) {
  const doc = iframe.contentDocument;
  const body = doc?.body;
  if (!doc || !body) return;
  liftActionBar(doc);
  const bar = doc.querySelector<HTMLElement>(".bar");
  if (bar) {
    const nextBar = `${Math.ceil(bar.getBoundingClientRect().height)}px`;
    if (body.style.getPropertyValue("--barH") !== nextBar) body.style.setProperty("--barH", nextBar);
  }
  const hud = doc.getElementById("hud");
  const bot = doc.querySelector<HTMLElement>(".hud-bot");
  if (!hud || !bot) return;
  const app = doc.getElementById("app");
  const hudBox = hud.getBoundingClientRect();
  const appBox = app?.getBoundingClientRect();
  const barBox = bar?.getBoundingClientRect();
  const limitTop = appBox && appBox.height > 8 ? appBox.top : barBox ? barBox.top : hudBox.bottom;
  const gap = body.classList.contains("m-home") ? 14 : 8;
  const bottom = Math.max(gap, Math.round(hudBox.bottom - limitTop + gap));
  const current = parseFloat(bot.style.bottom);
  if (!Number.isFinite(current) || Math.abs(current - bottom) > 1) bot.style.bottom = `${bottom}px`;
}

function watchVillagePanel(iframe: HTMLIFrameElement) {
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc?.body || !win) return () => {};
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      placeVillagePanel(iframe);
    });
  };
  // The iframe's Window type does not expose these constructors. The page window can
  // observe a same-origin game document.
  const observer = new MutationObserver(schedule);
  observer.observe(doc.body, { attributes: true, attributeFilter: ["class"] });
  const boxes = new ResizeObserver(schedule);
  const app = doc.getElementById("app");
  const hud = doc.getElementById("hud");
  if (app) {
    observer.observe(app, { childList: true });
    boxes.observe(app);
  }
  if (hud) {
    observer.observe(hud, { childList: true });
    boxes.observe(hud);
  }
  schedule();
  return () => {
    if (frame) win.cancelAnimationFrame(frame);
    observer.disconnect();
    boxes.disconnect();
    doc.querySelectorAll<HTMLElement>(".hud-bot").forEach((el) => {
      el.style.bottom = "";
    });
    const app = doc.getElementById("app");
    const bar = doc.querySelector<HTMLElement>(".bar");
    if (app && bar && bar.parentElement !== app) app.appendChild(bar);
  };
}

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
  /** On a phone, Play was tapped on a game that hasn't passed on a phone (#38): suggest a computer. */
  desktopPrompt: boolean;
  closeDesktopPrompt: () => void;
  /** "Play here anyway": starts the game from the same tap, so fullscreen still works. */
  playHereAnyway: () => void;
  /** Save to Library from the desktop prompt. */
  library?: HeroLibrary;
};

export type HeroLibrary = { saved: boolean; signedIn: boolean; onSave: () => void; onSignIn: () => void };

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
  phoneGate = false,
  library,
  children,
}: {
  game: Game;
  trailerUrl?: string | null;
  autoPlay?: boolean;
  allowPlay?: boolean;
  playLocked?: boolean;
  /** Phones get the desktop prompt instead of the game (#38). Set when the switch is on and the game isn't mobile ready. */
  phoneGate?: boolean;
  library?: HeroLibrary;
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
  // A ?play=1 start always arrives as autoStart turning true after the first render (see
  // useAutoPlayAllowed), so the server never renders the game frame and a phone never loads it unasked.
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [prevAutoStart, setPrevAutoStart] = useState(false);
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

  // The desktop prompt (#38), and whether the player chose to play here anyway on this visit.
  const [desktopPrompt, setDesktopPrompt] = useState(false);
  const [playAnyway, setPlayAnyway] = useState(false);

  const value = useMemo<HeroCtx>(() => {
    // Starts the game: the guest limit, the move to the canonical address, then play.
    function begin() {
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
        // During the tap, so the Fullscreen API still counts it as a user gesture.
        if (isPhonePlay()) window.dispatchEvent(new Event(PHONE_PLAY_EVENT));
      }
      onPlay();
    }
    return {
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
      desktopPrompt,
      library,
      startPlay() {
        if (!canPlay) return;
        // A phone, a game nobody has passed on a phone, and the switch on: suggest a computer (#38).
        if (phoneGate && !playAnyway && isPhonePlay()) {
          setDesktopPrompt(true);
          document.getElementById("game-stage")?.scrollIntoView({ block: "start" });
          return;
        }
        begin();
      },
      closeDesktopPrompt() {
        setDesktopPrompt(false);
      },
      playHereAnyway() {
        setPlayAnyway(true);
        setDesktopPrompt(false);
        begin();
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
        setDesktopPrompt(false);
        setSlide(id);
      },
    };
  }, [
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
    desktopPrompt,
    library,
    phoneGate,
    playAnyway,
  ]);

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
    desktopPrompt,
    closeDesktopPrompt,
    playHereAnyway,
    library,
  } = useProjectHero();
  const stageRef = useRef<HTMLDivElement>(null);
  // Set once the player leaves phone fullscreen, so the open-on-play fallback doesn't pull them back in.
  const leftPhoneFullscreen = useRef(false);
  // A real fullscreen request is waiting for the browser's answer. The CSS fallback waits too, or it
  // would switch on underneath a request that is about to succeed.
  const requesting = useRef(false);
  // How the game wants the phone held (#38), when someone has said.
  const wanted = game.orientation === "portrait" || game.orientation === "landscape" ? game.orientation : null;
  const portraitNow = usePortraitScreen();
  // "Play anyway" on the turn-your-phone prompt, until the game stops.
  const [rotateDismissed, setRotateDismissed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // Fallback for browsers without the Fullscreen API on elements (Safari on iPhone).
  const [pseudo, setPseudo] = useState(false);
  const [mobile, setMobile] = useState(false);
  // The visible screen, not 100dvh, which on a phone still runs under the browser bar.
  const [frameBox, setFrameBox] = useState<{ top: number; height: number } | null>(null);
  // Which frame (by frameKey) has finished loading, and which one timed out.
  const [loadedKey, setLoadedKey] = useState<number | null>(null);
  const [timedOutKey, setTimedOutKey] = useState<number | null>(null);
  const running = playing && game.embeddable && !playLocked;
  const loaded = loadedKey === frameKey;
  const timedOut = timedOutKey === frameKey && !loaded;

  useEffect(() => {
    function sync() {
      const on = document.fullscreenElement === stageRef.current;
      setFullscreen(on);
      // The landscape lock only holds in fullscreen; let the phone turn freely again after it.
      if (!on) unlockOrientation();
    }
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    const query = window.matchMedia(PHONE_PLAY);
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
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
    if (!running) {
      setPseudo(false);
      setRotateDismissed(false);
    }
  }
  // The next game may open fullscreen again. A ref, so it is written after render, not during it.
  useEffect(() => {
    if (!running) leftPhoneFullscreen.current = false;
  }, [running]);

  // A dialog is opening (sign in, report, ...): drop the fallback fullscreen so it can be seen.
  useEffect(() => {
    return onLeaveFullscreen(() => {
      leftPhoneFullscreen.current = true;
      setPseudo(false);
    });
  }, []);

  useEffect(() => {
    if (!pseudo) return;
    const root = document.querySelector<HTMLElement>("[data-scroll-root]");
    const previous = root?.style.overflow ?? "";
    if (root) root.style.overflow = "hidden";
    // Esc only reaches the page when focus is outside the game, so the Exit button stays visible too.
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        leftPhoneFullscreen.current = true;
        setPseudo(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      if (root) root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [pseudo]);

  // Must run inside the tap: requestFullscreen is called before the first await, while the browser
  // still counts the tap as the reason.
  async function enterFullscreen() {
    const node = stageRef.current;
    if (!node || pseudo || document.fullscreenElement || requesting.current) return;
    if (document.fullscreenEnabled && typeof node.requestFullscreen === "function") {
      requesting.current = true;
      try {
        await node.requestFullscreen({ navigationUI: "hide" });
        // Chrome on Android can hold the game's orientation while it is fullscreen. Elsewhere this
        // is refused quietly, and the turn-your-phone prompt asks instead.
        if (wanted && isPhonePlay()) void lockOrientation(wanted);
        return;
      } catch {
        // Refused (or unsupported for this element): fall through to the CSS fallback.
      } finally {
        requesting.current = false;
      }
    }
    setPseudo(true);
  }

  // The tap handler below always reaches the latest enterFullscreen. Updated after each render, since
  // refs must not be written during one.
  const enterFullscreenRef = useRef(enterFullscreen);
  useEffect(() => {
    enterFullscreenRef.current = enterFullscreen;
  });

  // Play on a phone opens the game fullscreen. A later fallback covers the case where the
  // Fullscreen API is missing (iPhone) or the play started without a tap (?play=1).
  useEffect(() => {
    function onPhonePlay() {
      setMobile(true);
      void enterFullscreenRef.current();
    }
    window.addEventListener(PHONE_PLAY_EVENT, onPhonePlay);
    return () => window.removeEventListener(PHONE_PLAY_EVENT, onPhonePlay);
  }, []);

  useEffect(() => {
    if (!running || !mobile) return;
    const id = window.setTimeout(() => {
      if (leftPhoneFullscreen.current || document.fullscreenElement || requesting.current) return;
      setPseudo(true);
    }, 80);
    return () => window.clearTimeout(id);
  }, [running, mobile]);

  useEffect(() => {
    if (!pseudo || !mobile) return;
    const viewport = window.visualViewport;
    const apply = () => {
      const next = {
        top: viewport?.offsetTop ?? 0,
        height: viewport?.height ?? window.innerHeight,
      };
      setFrameBox((prev) => (prev && prev.top === next.top && prev.height === next.height ? prev : next));
    };
    apply();
    viewport?.addEventListener("resize", apply);
    viewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      viewport?.removeEventListener("resize", apply);
      viewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      setFrameBox(null);
    };
  }, [pseudo, mobile]);

  async function toggleFullscreen() {
    const node = stageRef.current;
    if (!node) return;
    if (pseudo || document.fullscreenElement) {
      leftPhoneFullscreen.current = true;
      setPseudo(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      return;
    }
    leftPhoneFullscreen.current = false;
    await enterFullscreen();
  }

  async function collapse() {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    leftPhoneFullscreen.current = true;
    setPseudo(false);
    shrink();
  }

  const isFull = fullscreen || pseudo;
  const phoneFull = isFull && mobile;
  const frameSize = playFrameSize(game.curated, game.playUrl);
  const poster = !current || current.kind === "cover" || current.kind === "shot";
  // A portrait game on a computer plays in a tall, phone-shaped column instead of a wide box (#38).
  const tall = running && !mobile && game.orientation === "portrait";
  // On a phone in fullscreen, ask to turn the phone when it is held the other way from the game.
  const turnTo = phoneFull && wanted && !rotateDismissed && (wanted === "landscape") === portraitNow ? wanted : null;
  // The desktop prompt (#38) needs more room than a 16:9 box on a phone gives it.
  const prompting = desktopPrompt && !running && !playLocked;
  const mediaSize =
    pseudo || phoneFull || (tall && fullscreen)
      ? "min-h-0 flex-1"
      : tall
        ? "h-[min(78vh,820px)]"
        : prompting
          ? "min-h-[24rem]"
          : "aspect-video";
  const frame = running ? (
    <PlayFrame
      key={frameKey}
      src={game.playUrl}
      title={game.title}
      size={frameSize}
      lockLayout={mobile}
      flushBottom={phoneFull}
      onLoad={() => setLoadedKey(frameKey)}
    />
  ) : null;

  return (
    <div
      ref={stageRef}
      id="game-stage"
      className={cn(
        "project-stage dark flex flex-col overflow-hidden bg-pw-night-950 shadow-pw-3",
        // `fixed` has to replace `relative`. Tailwind keeps whichever rule comes last in the
        // stylesheet, so listing both leaves the stage in the page and the game's bottom is clipped.
        pseudo
          ? "fixed inset-x-0 z-[100] overscroll-contain rounded-none border-0"
          : "relative rounded-[22px] border border-[color-mix(in_srgb,var(--pw-sky)_18%,transparent)]",
        pseudo && !frameBox && "top-0 h-dvh",
      )}
      style={
        pseudo && frameBox
          ? { position: "fixed", left: 0, right: 0, top: frameBox.top, height: frameBox.height, zIndex: 100 }
          : undefined
      }
    >
      <div className={cn("stage-media relative w-full overflow-hidden", mediaSize)}>
        {running ? (
          <>
            {tall ? (
              <div data-stage-column className="absolute inset-y-0 left-1/2 aspect-[9/16] max-w-full -translate-x-1/2">
                {frame}
              </div>
            ) : (
              frame
            )}
            {turnTo ? <TurnPhone to={turnTo} onDismiss={() => setRotateDismissed(true)} /> : null}
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
                {/* Phones: Play sits in the corner so the cover stays visible; computers keep it centred. */}
                <div className="absolute right-3 bottom-3 z-10 md:hidden">
                  <Button variant="primary" onClick={startPlay} aria-label={`Play ${game.title}`}>
                    <IconGamepad aria-hidden />
                    Play
                    {game.embeddable ? null : <IconExternal aria-hidden />}
                  </Button>
                </div>
                <div className="absolute inset-0 z-10 hidden place-items-center p-4 md:grid">
                  {game.embeddable ? (
                    <button
                      type="button"
                      onClick={startPlay}
                      aria-label={`Play ${game.title}`}
                      className={cn("group flex flex-col items-center gap-2 rounded-pw-xl", focusRing)}
                    >
                      <span className="grid size-16 place-items-center rounded-full bg-linear-to-b from-pw-primary-hi to-pw-primary-lo text-pw-on-primary shadow-pw-glow transition-transform duration-150 ease-pw-out group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none md:size-[72px]">
                        <IconGamepad aria-hidden className="size-7" />
                      </span>
                      <span className={cn("text-pw-body font-bold", onArt)}>Play</span>
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Button variant="primary" size="lg" onClick={startPlay}>
                        <IconGamepad aria-hidden className="fill-current" />
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
                  <IconGamepad aria-hidden className="fill-current" />
                  {game.embeddable ? "Play game" : "Play"}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
        {prompting ? (
          <PlayOnComputer library={library} onAnyway={playHereAnyway} onClose={closeDesktopPrompt} />
        ) : null}
      </div>

      {phoneFull ? (
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className={cn(
            "flex w-full shrink-0 items-center justify-center gap-1.5 border-t border-white/10 bg-pw-night-950 text-[13px] leading-none font-semibold text-pw-on-art",
            focusRing,
          )}
          style={{ boxSizing: "content-box", height: 34, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <IconFullscreenExit aria-hidden className="size-3.5" />
          Exit fullscreen
        </button>
      ) : null}

      {running && !phoneFull ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-[color-mix(in_srgb,var(--pw-sky)_12%,transparent)] bg-pw-night-900 px-3 py-2">
          <p className="mr-auto flex min-w-0 items-center gap-2 text-pw-body-sm text-pw-on-art">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-pw-success" />
            <span className="truncate">
              Playing <span className="font-semibold">{game.title}</span>
            </span>
          </p>
          {isFull || tall ? null : (
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

/**
 * On a phone, after Play on a game nobody has passed on a phone, while the switch is on (#38).
 * Saving puts it in the account's Library, so it is waiting on the computer; guests sign in first.
 * "Play here anyway" stays, small: we can be wrong about a game, and the player decides.
 */
function PlayOnComputer({
  library,
  onAnyway,
  onClose,
}: {
  library?: HeroLibrary;
  onAnyway: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Best played on a computer"
      className="absolute inset-0 z-20 grid place-items-center bg-[color-mix(in_srgb,var(--pw-night-950)_90%,transparent)] px-5 py-6 text-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={cn("absolute top-3 right-3 grid size-9 place-items-center rounded-pw-pill text-pw-on-art", focusRing)}
      >
        <IconClose aria-hidden className="size-4" />
      </button>
      <div className="flex max-w-[20rem] flex-col items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--pw-sky)_16%,transparent)] text-pw-sky">
          <IconKeyboard aria-hidden className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <p className={cn("text-pw-title font-bold", onArt)}>Best played on a computer</p>
          <p className={cn("text-pw-body-sm", onArt)}>
            This game may need a keyboard or a bigger screen. Save it and play it on your computer.
          </p>
        </div>
        {library ? (
          library.signedIn ? (
            <Button variant="primary" onClick={library.onSave} aria-pressed={library.saved}>
              <IconBookmark aria-hidden filled={library.saved} />
              {library.saved ? "Saved to your Library" : "Save to Library"}
            </Button>
          ) : (
            <Button variant="primary" onClick={library.onSignIn}>
              Sign in to save it
            </Button>
          )
        ) : null}
        {library?.saved ? (
          <p className={cn("text-pw-caption", onArt)}>Open your Library on your computer to play it.</p>
        ) : null}
        <button
          type="button"
          onClick={onAnyway}
          className={cn("mt-1 rounded-pw-sm text-pw-body-sm text-pw-on-art underline underline-offset-4", focusRing)}
        >
          Play here anyway
        </button>
      </div>
    </div>
  );
}

/**
 * Over a fullscreen game on a phone held the wrong way (#38). It goes away by itself once the phone
 * turns. Chrome on Android usually turns the screen for the player (the orientation lock), so this
 * is mostly for iPhone, which cannot.
 */
function TurnPhone({ to, onDismiss }: { to: "portrait" | "landscape"; onDismiss: () => void }) {
  const sideways = to === "landscape";
  return (
    <div
      role="status"
      className="absolute inset-0 z-30 grid place-items-center bg-[color-mix(in_srgb,var(--pw-night-950)_94%,transparent)] p-6 text-center"
    >
      <div className="flex max-w-[18rem] flex-col items-center gap-4">
        <IconPhone
          aria-hidden
          className={cn(
            "size-14 text-pw-sky",
            sideways ? "motion-safe:animate-[pw-turn-side_2.4s_ease-in-out_infinite]" : "rotate-90 motion-safe:animate-[pw-turn-up_2.4s_ease-in-out_infinite]",
          )}
        />
        <div className="flex flex-col gap-1">
          <p className={cn("text-pw-title font-bold", onArt)}>{sideways ? "Turn your phone sideways" : "Turn your phone upright"}</p>
          <p className={cn("text-pw-body-sm", onArt)}>
            {sideways ? "This game plays in landscape." : "This game plays in portrait."}
          </p>
        </div>
        <Button variant="ghost" className="text-pw-on-art" onClick={onDismiss}>
          Play anyway
        </Button>
      </div>
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
                    <IconGamepad aria-hidden className="size-3.5" />
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
            <IconGamepad aria-hidden className="size-5" />
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
  lockLayout,
  flushBottom,
  onLoad,
}: {
  src: string;
  title: string;
  size: { width: number; height: number } | null;
  lockLayout: boolean;
  flushBottom: boolean;
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
    const el = iframeRef.current;
    if (!el) return;
    let stopWatch = () => {};
    const apply = () => {
      stopWatch();
      lockFrameLayout(el, lockLayout, flushBottom);
      stopWatch = lockLayout && flushBottom ? watchVillagePanel(el) : () => {};
    };
    apply();
    el.addEventListener("load", apply);
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      el.removeEventListener("load", apply);
      observer.disconnect();
      stopWatch();
      lockFrameLayout(el, false, false);
    };
  }, [lockLayout, flushBottom, src]);

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
