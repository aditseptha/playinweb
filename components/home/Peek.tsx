"use client";

import { IconBook, IconBookmark, IconHeart, IconPlay, IconUsers } from "@/components/icons";
import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { playHref } from "@/components/GameCard";
import { canPlayClipOnHover, PreviewClip } from "@/components/PreviewClip";
import { GameThumb } from "@/components/GameThumb";
import { excerpt, formatDate } from "@/components/home/filters";
import s from "@/components/home/home.module.css";
import { cn } from "@/lib/cn";
import { formatPlays } from "@/lib/format";
import { canOptimizeImage } from "@/lib/optimize-image";
import { useGames } from "@/lib/store";
import type { Game } from "@/lib/types";

const HOVER_DELAY_MS = 400;
const HOLD_MS = 450;
const PEEK_W = 336;
const PEEK_GAP = 14;

function mq(q: string) {
  return typeof window !== "undefined" && window.matchMedia(q).matches;
}
const isMobileLayout = () => mq("(max-width: 760px)");

type PeekState = { game: Game; rect: DOMRect } | null;

type HomeUi = {
  hoverStart: (game: Game, el: HTMLElement) => void;
  hoverEnd: () => void;
  openSheet: (game: Game) => void;
  toast: (message: string) => void;
  toggleSave: (game: Game) => void;
};

const HomeUiContext = createContext<HomeUi | null>(null);

export function useHomeUi() {
  const ctx = useContext(HomeUiContext);
  if (!ctx) throw new Error("useHomeUi must be used inside HomeUiProvider");
  return ctx;
}

/** Hover card on desktop, press-and-hold detail sheet on touch, and the toast. */
export function HomeUiProvider({ children }: { children: ReactNode }) {
  const { library, toggleLibrary } = useGames();
  const [peek, setPeek] = useState<PeekState>(null);
  const [sheet, setSheet] = useState<Game | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const peekTimer = useRef<number | undefined>(undefined);
  const toastTimer = useRef<number | undefined>(undefined);

  // Built once and read through refs, so every card can share one stable value.
  const libraryRef = useRef(library);
  useEffect(() => {
    libraryRef.current = library;
  }, [library]);

  const [ui] = useState<HomeUi>(() => {
    const toast = (text: string) => {
      setMessage(text);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setMessage(null), 2600);
    };
    return {
      hoverStart: (game, el) => {
        window.clearTimeout(peekTimer.current);
        peekTimer.current = window.setTimeout(() => setPeek({ game, rect: el.getBoundingClientRect() }), HOVER_DELAY_MS);
      },
      hoverEnd: () => {
        window.clearTimeout(peekTimer.current);
        setPeek(null);
      },
      openSheet: (game) => {
        window.clearTimeout(peekTimer.current);
        setPeek(null);
        setSheet(game);
      },
      toast,
      toggleSave: (game) => {
        const had = libraryRef.current.includes(game.id);
        toggleLibrary(game.id);
        toast(had ? "Removed from Favorites" : "Saved to Favorites");
      },
    };
  });

  useEffect(() => {
    const close = () => {
      window.clearTimeout(peekTimer.current);
      setPeek(null);
    };
    // Capture catches the homepage's own scroll container too.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, []);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  const saved = sheet ? library.includes(sheet.id) : false;

  return (
    <HomeUiContext.Provider value={ui}>
      {children}
      {peek ? <PeekCard peek={peek} /> : null}
      {sheet ? (
        <>
          <div className={s.scrim} onClick={() => setSheet(null)} aria-hidden />
          <div className={cn(s.sheet, s.detailSheet)} role="dialog" aria-modal="true" aria-label={`About ${sheet.title}`}>
            <div className={s.grab} />
            <div className={s.sheetBody}>
              <Shots game={sheet} />
              <div style={{ marginTop: 14 }}>
                <DetailBody game={sheet} />
              </div>
            </div>
            <div className={s.sheetFoot}>
              <button type="button" className={cn(s.btn, s.btnGhost)} aria-pressed={saved} onClick={() => ui.toggleSave(sheet)}>
                <IconBookmark className={cn(s.ic, s.sm, saved && s.saved)} filled={saved} />
                {saved ? "Saved" : "Save"}
              </button>
              <Link href={playHref(sheet)} className={cn(s.btn, s.btnPrimary)} onClick={() => setSheet(null)}>
                <IconPlay className={cn(s.ic, s.sm)} />
                Play now
              </Link>
            </div>
          </div>
        </>
      ) : null}
      {message ? (
        <div className={s.toast} role="status">
          {message}
        </div>
      ) : null}
    </HomeUiContext.Provider>
  );
}

/** Pointer handlers for a card: hover opens the peek on desktop, a long press opens the sheet on touch. */
export function usePeek(game: Game) {
  const ui = useHomeUi();
  const hold = useRef<{ x: number; y: number; fired: boolean; t: number | null } | null>(null);
  const clear = () => {
    if (hold.current?.t) {
      window.clearTimeout(hold.current.t);
      hold.current.t = null;
    }
  };

  return {
    onPointerEnter: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" && !isMobileLayout()) ui.hoverStart(game, e.currentTarget);
    },
    onPointerLeave: () => {
      ui.hoverEnd();
      clear();
    },
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      ui.hoverEnd();
      if ((e.pointerType === "mouse" && !isMobileLayout()) || e.button > 0) return;
      const start = { x: e.clientX, y: e.clientY, fired: false, t: null as number | null };
      start.t = window.setTimeout(() => {
        start.fired = true;
        start.t = null;
        try {
          navigator.vibrate?.(12);
        } catch {
          // vibration is optional
        }
        ui.openSheet(game);
      }, HOLD_MS);
      hold.current = start;
    },
    onPointerMoveCapture: (e: ReactPointerEvent<HTMLElement>) => {
      const h = hold.current;
      if (h?.t && (Math.abs(e.clientX - h.x) > 10 || Math.abs(e.clientY - h.y) > 10)) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    // A long press already opened the sheet; swallow the click that follows it.
    onClickCapture: (e: React.MouseEvent) => {
      if (hold.current?.fired) {
        e.preventDefault();
        e.stopPropagation();
        hold.current = null;
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (hold.current) e.preventDefault();
    },
  };
}

function ShotImage({ src }: { src: string }) {
  const sharp = canOptimizeImage(src) ? (
    <Image src={src} alt="" fill sizes="340px" className="object-contain" />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
  );
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={s.shotBlur} />
      {sharp}
    </>
  );
}

/** Real screenshots when the game has them, cycling; otherwise the cover. */
function Shots({ game, playClip = false }: { game: Game; playClip?: boolean }) {
  const shots = game.screenshots.length > 0 ? game.screenshots.slice(0, 4) : [];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (playClip || shots.length < 2 || mq("(prefers-reduced-motion: reduce)")) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % shots.length), 1500);
    return () => window.clearInterval(t);
  }, [playClip, shots.length]);
  if (playClip && game.previewClipUrl && canPlayClipOnHover()) {
    return (
      <div className={s.shots}>
        <GameThumb game={game} sizes="340px" />
        <PreviewClip url={game.previewClipUrl} kind={game.previewClipKind ?? "video"} />
      </div>
    );
  }

  if (shots.length === 0) {
    return (
      <div className={s.shots}>
        <GameThumb game={game} sizes="340px" />
      </div>
    );
  }
  return (
    <div className={s.shots}>
      {shots.map((src, k) => (
        <div key={src} className={cn(s.shot, k === index && s.shotOn)}>
          <ShotImage src={src} />
        </div>
      ))}
      {shots.length > 1 ? (
        <div className={s.shotDots}>
          {shots.map((src, k) => (
            <i key={src} className={k === index ? s.dotOn : undefined} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DetailBody({ game }: { game: Game }) {
  const date = formatDate(game.createdAt);
  const blurb = excerpt(game.description, 220);
  return (
    <>
      <h3 className={s.pkTitle}>{game.title}</h3>
      <div className={s.pkWhen}>
        {date ? `Released ${date} · ` : ""}
        {game.developer}
      </div>
      {blurb ? <p className={s.pkDesc}>{blurb}</p> : null}
      <div className={s.pkInfo}>
        <span>
          <IconUsers className={cn(s.ic, s.xs)} />
          {formatPlays(game.playCount)} plays
        </span>
        {game.likeCount > 0 ? (
          <span>
            <IconHeart className={cn(s.ic, s.xs)} />
            {formatPlays(game.likeCount)} likes
          </span>
        ) : null}
        {game.embeddable ? (
          <span>
            <IconBook className={cn(s.ic, s.xs)} />
            Plays in browser
          </span>
        ) : null}
      </div>
      {game.tags.length > 0 ? (
        <div className={s.pkTags}>
          {game.tags.slice(0, 5).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      ) : null}
    </>
  );
}

function PeekCard({ peek }: { peek: NonNullable<PeekState> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; ay: number; side: "r" | "l" } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = peek.rect;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const h = el.offsetHeight;
    const right = r.right + PEEK_GAP + PEEK_W <= vw - 12;
    const left = right ? r.right + PEEK_GAP : Math.max(12, r.left - PEEK_GAP - PEEK_W);
    const top = Math.min(Math.max(12, r.top + r.height / 2 - h / 2), vh - h - 12);
    const ay = Math.min(Math.max(22, r.top + r.height / 2 - top), h - 22);
    // Measured after layout, so this effect has to set state.
    setPos({ left, top, ay, side: right ? "r" : "l" });
  }, [peek]);

  return (
    <div
      ref={ref}
      role="tooltip"
      className={cn(s.peek, s.onDark, pos && (pos.side === "r" ? s.peekR : s.peekL))}
      style={
        pos
          ? ({ left: pos.left, top: pos.top, "--ay": `${pos.ay}px` } as React.CSSProperties)
          : { left: -9999, top: 0, visibility: "hidden" }
      }
    >
      <DetailBody game={peek.game} />
      <Shots game={peek.game} playClip />
    </div>
  );
}
