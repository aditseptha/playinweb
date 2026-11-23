"use client";

import { IconChevronLeft, IconChevronRight, type AppIcon } from "@/components/icons";
import { HomeLink } from "@/components/home/HomeLink";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import s from "@/components/home/home.module.css";
import { cn } from "@/lib/cn";

export function useScroller() {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: true, r: true });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ l: el.scrollLeft <= 2, r: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  const go = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  return { ref, edge, go };
}

type Edge = { l: boolean; r: boolean };

function Arrow({ dir, edge, go, className }: { dir: -1 | 1; edge: Edge; go: (dir: -1 | 1) => void; className?: string }) {
  return (
    <button
      type="button"
      className={cn(s.arrow, className)}
      disabled={dir === -1 ? edge.l : edge.r}
      onClick={() => go(dir)}
      aria-label={dir === -1 ? "Previous" : "Next"}
    >
      {dir === -1 ? <IconChevronLeft className={cn(s.ic, s.sm)} /> : <IconChevronRight className={cn(s.ic, s.sm)} />}
    </button>
  );
}

/**
 * A scrolling track with paging arrows over its left and right edges. Every home row uses this one
 * placement (the Featured games approach). The arrows hide on touch-size screens, where people swipe.
 */
export function Carousel({ edge, go, children }: { edge: Edge; go: (dir: -1 | 1) => void; children: ReactNode }) {
  const scrollable = !(edge.l && edge.r);
  return (
    <div className={s.carousel}>
      {scrollable ? <Arrow dir={-1} edge={edge} go={go} className={cn(s.side, s.sideL)} /> : null}
      {children}
      {scrollable ? <Arrow dir={1} edge={edge} go={go} className={cn(s.side, s.sideR)} /> : null}
    </div>
  );
}

export function SectionHead({
  icon: Icon,
  title,
  count,
  tools,
}: {
  icon: AppIcon;
  title: string;
  count?: number;
  tools?: ReactNode;
}) {
  return (
    <div className={s.secHead}>
      <span className={s.secIcon}>
        <Icon className={cn(s.ic, s.sm)} />
      </span>
      <h2 className={s.secTitle}>
        {title}
        {count !== undefined ? (
          <span className={cn(s.secCount, s.tnum)}>
            {" "}
            · {count} {count === 1 ? "game" : "games"}
          </span>
        ) : null}
      </h2>
      {tools ? <div className={s.secTools}>{tools}</div> : null}
    </div>
  );
}

export function SeeAll({ href, label = "See all" }: { href: string; label?: string }) {
  // The homepage and its filters ("/", "/?view=…") stay on the page through HomeLink; any other page is a normal link.
  if (href !== "/" && !href.startsWith("/?")) {
    return (
      <Link href={href} className={s.seeAll}>
        {label}
      </Link>
    );
  }
  return (
    <HomeLink href={href} scroll={false} className={s.seeAll}>
      {label}
    </HomeLink>
  );
}

/** A titled carousel row: the link next to the title, paging arrows over the track's edges. */
export function Row({
  icon,
  title,
  href,
  linkLabel,
  kind,
  phoneScroll = false,
  className,
  children,
}: {
  icon: AppIcon;
  title: string;
  href?: string;
  /** Text of the link next to the title. Defaults to "See all". */
  linkLabel?: string;
  kind: "tall" | "wide";
  /** On phones, keep a horizontal swipe strip instead of the 2-column grid other rows turn into. */
  phoneScroll?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { ref, edge, go } = useScroller();

  return (
    <section className={cn(s.reveal, className)}>
      <SectionHead icon={icon} title={title} tools={href ? <SeeAll href={href} label={linkLabel} /> : null} />
      <Carousel edge={edge} go={go}>
        <div ref={ref} className={cn(s.track, kind === "tall" ? s.trackTall : s.trackWide, phoneScroll && s.trackPhoneScroll)}>
          {children}
        </div>
      </Carousel>
    </section>
  );
}
