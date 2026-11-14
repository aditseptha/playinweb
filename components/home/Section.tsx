"use client";

import { IconChevronLeft, IconChevronRight, type AppIcon } from "@/components/icons";
import { HomeLink } from "@/components/home/HomeLink";
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

export function Arrows({ edge, go }: { edge: Edge; go: (dir: -1 | 1) => void }) {
  return (
    <>
      <Arrow dir={-1} edge={edge} go={go} />
      <Arrow dir={1} edge={edge} go={go} />
    </>
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
  return (
    <HomeLink href={href} scroll={false} className={s.seeAll}>
      {label}
    </HomeLink>
  );
}

/** A titled carousel row: paging arrows next to the title (or over the edges for the featured row). */
export function Row({
  icon,
  title,
  href,
  kind,
  sideArrows = false,
  children,
}: {
  icon: AppIcon;
  title: string;
  href?: string;
  kind: "tall" | "wide";
  sideArrows?: boolean;
  children: ReactNode;
}) {
  const { ref, edge, go } = useScroller();
  const scrollable = !(edge.l && edge.r);
  const track = (
    <div ref={ref} className={cn(s.track, kind === "tall" ? s.trackTall : s.trackWide)}>
      {children}
    </div>
  );

  return (
    <section className={s.reveal}>
      <SectionHead
        icon={icon}
        title={title}
        tools={
          <>
            {!sideArrows && scrollable ? <Arrows edge={edge} go={go} /> : null}
            {href ? <SeeAll href={href} /> : null}
          </>
        }
      />
      {sideArrows ? (
        <div className={s.carousel}>
          {scrollable ? <Arrow dir={-1} edge={edge} go={go} className={cn(s.side, s.sideL)} /> : null}
          {track}
          {scrollable ? <Arrow dir={1} edge={edge} go={go} className={cn(s.side, s.sideR)} /> : null}
        </div>
      ) : (
        track
      )}
    </section>
  );
}
