"use client";

import { IconBookmark, IconPlay, IconPlus } from "@/components/icons";
import { GameThumb } from "@/components/GameThumb";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { playHref } from "@/components/GameCard";
import s from "@/components/home/home.module.css";
import { useHomeUi } from "@/components/home/Peek";
import { cn } from "@/lib/cn";
import { formatPlays } from "@/lib/format";
import { apexHref } from "@/lib/host";
import { objectPosition } from "@/lib/media-standard";
import { canOptimizeImage } from "@/lib/optimize-image";
import { usePrefersReducedMotion } from "@/lib/reduced-motion";
import { useGames } from "@/lib/store";
import type { Game } from "@/lib/types";

const FALLBACK_ART = "/home-hero.webp";
const AUTO_MS = 9000;
/** Eyebrow + subtitle stack below the measured title (px). */
const HERO_COPY_TAIL = 65;

const FLIES = Array.from({ length: 14 }, (_, k) => ({
  l: 50 + ((k * 37) % 46),
  t: 28 + ((k * 53) % 58),
  d: 6 + (k % 5) * 1.4,
  dl: -(k * 0.9),
  x: (k % 2 ? 1 : -1) * (10 + ((k * 7) % 28)),
}));

function HeroArt({ game, active }: { game: Game; active: boolean }) {
  const art = game.thumbnailUrl?.trim() || FALLBACK_ART;
  const focus = objectPosition(game.focalX, game.focalY);
  return (
    <div className={cn(s.heroArtSlide, active && s.heroArtSlideOn)} aria-hidden>
      {canOptimizeImage(art) ? (
        <Image src={art} alt="" fill sizes="(max-width: 767px) 100vw, 62vw" className={s.heroArt} style={{ objectPosition: focus }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={art} alt="" className={s.heroArt} style={{ objectPosition: focus }} />
      )}
    </div>
  );
}

/**
 * Homepage hero carousel. Games come from admin spotlights, or the most played creator titles.
 */
export function Hero({ games }: { games: Game[] }) {
  const slides = games.length > 0 ? games : [];
  const [index, setIndex] = useState(0);
  const reduceMotion = usePrefersReducedMotion();
  const { library } = useGames();
  const { toggleSave } = useHomeUi();
  const dotsId = useId();
  const active = slides[index] ?? null;
  const saved = active ? library.includes(active.id) : false;
  const count = slides.length;
  const tag = active?.tags[0];

  const [paused, setPaused] = useState(false);
  /** Tallest hero title among spotlight slides — fixed min-height so CTAs do not jump. */
  const [titleMinH, setTitleMinH] = useState<number | undefined>();
  const [titleOneLine, setTitleOneLine] = useState(false);
  const titleMeasureRef = useRef<HTMLDivElement>(null);
  const slideKey = slides.map((g) => g.id).join("|");
  const titleCandidates = slides.length > 0 ? slides.map((g) => g.title) : ["Play indie games"];

  useEffect(() => {
    setIndex(0);
  }, [slideKey]);

  useLayoutEffect(() => {
    const root = titleMeasureRef.current;
    if (!root) return;
    const measure = () => {
      let max = 0;
      root.querySelectorAll<HTMLElement>("[data-hero-title-measure]").forEach((el) => {
        max = Math.max(max, el.getBoundingClientRect().height);
      });
      setTitleMinH(max > 0 ? Math.ceil(max) : undefined);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [slideKey, titleCandidates.join("\0")]);

  useLayoutEffect(() => {
    const root = titleMeasureRef.current;
    if (!root) return;
    const measure = () => {
      const nodes = root.querySelectorAll<HTMLElement>("[data-hero-title-measure]");
      if (!nodes.length) return;
      const linePx = parseFloat(getComputedStyle(nodes[0]!).lineHeight);
      let activeH = 0;
      nodes.forEach((el, i) => {
        if (slides[i]?.id === active?.id) activeH = el.getBoundingClientRect().height;
      });
      const one =
        activeH > 0 && Number.isFinite(linePx) && linePx > 0
          ? activeH <= linePx * 1.15
          : titleMinH != null && activeH > 0 && activeH < titleMinH * 0.72;
      setTitleOneLine(one);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [index, slideKey, active?.id, slides, titleMinH]);

  useEffect(() => {
    if (count < 2 || reduceMotion || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTO_MS);
    return () => window.clearInterval(id);
  }, [count, reduceMotion, paused, slideKey]);

  return (
    <section
      className={cn(s.hero, s.onDark)}
      aria-labelledby="hero-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className={s.heroArtWrap} aria-hidden>
        {slides.length > 0 ? (
          slides.map((game, i) => <HeroArt key={game.id} game={game} active={i === index} />)
        ) : canOptimizeImage(FALLBACK_ART) ? (
          <Image src={FALLBACK_ART} alt="" fill preload sizes="(max-width: 767px) 100vw, 62vw" className={s.heroArt} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={FALLBACK_ART} alt="" className={s.heroArt} />
        )}
      </div>
      <div className={s.fog} aria-hidden />
      <div className={cn(s.fog, s.fog2)} aria-hidden />
      <div className={s.flies} aria-hidden>
        {FLIES.map((f, k) => (
          <i
            key={k}
            className={s.fly}
            style={{ left: `${f.l}%`, top: `${f.t}%`, "--d": `${f.d}s`, "--dl": `${f.dl}s`, "--x": `${f.x}px` } as CSSProperties}
          />
        ))}
      </div>
      <div className={s.frame}>
        <div className={cn(s.wrap, s.heroBody)}>
          <div
            className={s.heroCopy}
            style={
              titleMinH
                ? ({
                    ["--hero-title-min-h" as string]: `${titleMinH}px`,
                    minHeight: titleMinH + HERO_COPY_TAIL,
                  } as CSSProperties)
                : undefined
            }
          >
            <div className={s.eyebrow} aria-live="polite">
              {active
                ? `Featured game${tag ? ` · ${tag}` : ""}${count > 1 ? ` · ${index + 1} of ${count}` : ""}`
                : "Indie games in your browser"}
            </div>
            <div className={s.heroTitleSlot}>
              <h1 id="hero-title" className={cn(s.heroTitle, titleOneLine && s.heroTitleOneLine)}>
                {active ? active.title : "Play indie games"}
              </h1>
            </div>
            <div className={s.heroSub}>
              {active ? `By ${active.developer} · ${formatPlays(active.playCount)} plays` : "Nothing to install"}
            </div>
          </div>
          <div ref={titleMeasureRef} className={s.heroTitleMeasure} aria-hidden>
            {titleCandidates.map((title, i) => (
              <h1 key={`${i}:${title}`} data-hero-title-measure className={s.heroTitle}>
                {title}
              </h1>
            ))}
          </div>
          <div className={s.heroActions}>
            <div className={s.heroCta}>
              {active ? (
                <>
                  <Link href={playHref(active)} className={cn(s.btn, s.btnPrimary)}>
                    <IconPlay className={s.ic} />
                    Play now
                  </Link>
                  <button type="button" className={cn(s.btn, s.btnDark)} aria-pressed={saved} onClick={() => toggleSave(active)}>
                    <IconBookmark className={cn(s.ic, saved && s.saved)} filled={saved} />
                    {saved ? "Saved" : "Save"}
                  </button>
                </>
              ) : (
                <Link href={apexHref("/register")} className={cn(s.btn, s.btnPrimary)}>
                  <IconPlus className={s.ic} />
                  Publish the first game
                </Link>
              )}
            </div>
            {count > 1 ? (
              <div className={s.heroPager} role="tablist" aria-label="Featured games" id={dotsId}>
                {slides.map((game, i) => (
                  <button
                    key={game.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Show ${game.title}`}
                    className={cn(s.heroThumb, i === index && s.heroThumbOn)}
                    onClick={() => setIndex(i)}
                  >
                    <GameThumb game={game} sizes="40px" ratio="portrait" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
