"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { formatPlays } from "@/lib/format";

const PHRASES = ["Free Online", "Instant", "Indie Web", "Anywhere"];

function TypedPhrase() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = PHRASES[index];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(phrase);
      const t = window.setTimeout(() => setIndex((i) => (i + 1) % PHRASES.length), 2800);
      return () => window.clearTimeout(t);
    }

    if (!deleting && text === phrase) {
      const t = window.setTimeout(() => setDeleting(true), 1700);
      return () => window.clearTimeout(t);
    }
    if (deleting && text.length === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % PHRASES.length);
      return;
    }

    const t = window.setTimeout(
      () => {
        setText((prev) => (deleting ? prev.slice(0, -1) : phrase.slice(0, prev.length + 1)));
      },
      deleting ? 32 : 68,
    );
    return () => window.clearTimeout(t);
  }, [deleting, index, text]);

  return (
    <span
      className="inline-flex min-w-[11.5ch] items-baseline whitespace-nowrap text-[oklch(0.86_0.15_85)] [text-shadow:0_1px_2px_oklch(0_0_0_/_0.4),0_8px_20px_oklch(0.7_0.12_85_/_0.35)]"
      aria-hidden
    >
      {text}
      <span className="ml-[0.06em] inline-block h-[0.82em] w-[0.08em] translate-y-[0.08em] bg-current motion-reduce:hidden animate-[pulse_0.9s_steps(1)_infinite]" />
    </span>
  );
}

function RollingValue({ n }: { n: number }) {
  const text = formatPlays(n);
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    const id = window.setTimeout(() => setOn(true), 30);
    return () => window.clearTimeout(id);
  }, [n]);

  return (
    <span className="inline-flex h-[1em] items-start overflow-hidden tabular-nums" aria-label={text}>
      {text.split("").map((ch, i) => {
        if (ch < "0" || ch > "9") {
          return (
            <span key={`s-${i}`} className="leading-none">
              {ch}
            </span>
          );
        }
        const digit = Number(ch);
        return (
          <span key={`d-${i}`} className="inline-block h-[1em] overflow-hidden leading-none" aria-hidden>
            <span
              className="flex flex-col transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{
                transform: on ? `translateY(-${10 + digit}em)` : "translateY(0)",
                transitionDelay: `${80 + i * 90}ms`,
              }}
            >
              {Array.from({ length: 20 }, (_, j) => (
                <span key={j} className="flex h-[1em] shrink-0 items-center justify-center leading-none">
                  {j % 10}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function GlassStat({
  heroRef,
  children,
}: {
  heroRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [frost, setFrost] = useState({ w: 0, h: 0, x: 0, y: 0 });

  useLayoutEffect(() => {
    const hero = heroRef.current;
    const card = cardRef.current;
    if (!hero || !card) return;

    const measure = () => {
      const hr = hero.getBoundingClientRect();
      const cr = card.getBoundingClientRect();
      setFrost({ w: hr.width, h: hr.height, x: cr.left - hr.left, y: cr.top - hr.top });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hero);
    ro.observe(card);
    const scrollRoot = card.closest("[class*='overflow-y-auto']");
    scrollRoot?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      scrollRoot?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [heroRef]);

  return (
    <div
      ref={cardRef}
      className="liquid-glass relative min-w-0 overflow-hidden rounded-[18px] px-2 py-3 text-center sm:px-3 sm:py-3.5"
    >
      <div
        className="pointer-events-none absolute z-0"
        style={{ width: frost.w, height: frost.h, left: -frost.x, top: -frost.y }}
        aria-hidden
      >
        <div
          className="absolute inset-[-28px] scale-110 bg-cover bg-[position:68%_48%] blur-[22px]"
          style={{ backgroundImage: "url(/home-hero.webp)" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.16_0.03_250_/_0.78)_0%,oklch(0.18_0.03_250_/_0.42)_28%,oklch(0.2_0.03_250_/_0.12)_48%,transparent_62%)]" />
      </div>
      {children}
    </div>
  );
}

export function HomeHero({
  stats,
}: {
  stats: { value: number; label: string }[];
}) {
  const heroRef = useRef<HTMLElement>(null);

  return (
    <section ref={heroRef} className="relative isolate rounded-2xl">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
        <Image
          src="/home-hero.webp"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-[68%_48%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.16_0.03_250_/_0.78)_0%,oklch(0.18_0.03_250_/_0.42)_28%,oklch(0.2_0.03_250_/_0.12)_48%,transparent_62%)]" />
      </div>

      <div className="relative z-10 flex min-h-[320px] flex-col justify-between gap-10 px-5 py-8 sm:min-h-[380px] sm:px-8 sm:py-10 lg:min-h-[420px] lg:px-12 lg:py-12">
        <div>
          <h1 className="max-w-[18ch] text-[40px] font-bold leading-[1.02] tracking-tight text-white [text-shadow:0_1px_2px_oklch(0_0_0_/_0.45),0_12px_28px_oklch(0_0_0_/_0.28)] sm:text-[52px] lg:text-[64px]">
            <span className="sr-only">Play free online, instant, indie web, or anywhere games</span>
            <span aria-hidden>
              Play <TypedPhrase /> Games
            </span>
          </h1>
          <p className="mt-4 max-w-[38ch] text-[16px] leading-[1.55] text-white/92 [text-shadow:0_1px_10px_oklch(0_0_0_/_0.4)] sm:mt-5 sm:text-[17px]">
            Indie games you can open in the browser. No install, no paywall. Pick a title and play.
          </p>
        </div>

        {stats.length > 0 ? (
          <dl className="grid w-full max-w-md grid-cols-3 gap-2 sm:gap-2.5">
            {stats.map((item) => (
              <GlassStat key={item.label} heroRef={heroRef}>
                <dd className="relative z-10 overflow-hidden text-[22px] font-semibold leading-none tracking-tight text-white sm:text-[26px] lg:text-[28px]">
                  <RollingValue key={`${item.label}-${item.value}`} n={item.value} />
                </dd>
                <dt className="relative z-10 mt-1.5 text-[11px] font-medium tracking-[0.08em] text-white/88 sm:text-[12px]">
                  {item.label}
                </dt>
              </GlassStat>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
