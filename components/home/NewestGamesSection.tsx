"use client";

import { IconRocket } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import { SlotCard, TallCard } from "@/components/home/cards";
import { byNewest, filtersHref } from "@/components/home/filters";
import s from "@/components/home/home.module.css";
import { SectionHead } from "@/components/home/Section";
import type { Game } from "@/lib/types";
import { HomeLink } from "@/components/home/HomeLink";

const ROWS_PER_LOAD = 2;

function useGridColumns() {
  const [cols, setCols] = useState(6);

  useEffect(() => {
    const update = () => {
      if (window.matchMedia("(max-width: 767px)").matches) setCols(2);
      else if (window.matchMedia("(max-width: 1180px)").matches) setCols(4);
      else setCols(6);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return cols;
}

function scrollParent(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll") return el;
  }
  return null;
}

/** All registered games, newest first — grid with lazy-loaded batches of two rows. */
export function NewestGamesSection({ games, publishSlot }: { games: Game[]; publishSlot?: boolean }) {
  const cols = useGridColumns();
  const list = byNewest(games);
  const batch = cols * ROWS_PER_LOAD;
  const lead = publishSlot ? 1 : 0;
  const total = lead + list.length;

  const floor = batch + lead;
  const [visible, setVisible] = useState(() => Math.min(total, floor));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [prevFloor, setPrevFloor] = useState(floor);
  const [prevTotal, setPrevTotal] = useState(total);
  if (floor !== prevFloor || total !== prevTotal) {
    setPrevFloor(floor);
    setPrevTotal(total);
    setVisible((prev) => Math.min(total, Math.max(prev, floor)));
  }

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visible >= total) return;

    // The homepage scrolls inside its own container, not the window. Watching from the window, the
    // container clips the sentinel and any margin is ignored, so rows only loaded once on screen.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible((n) => Math.min(total, n + batch));
        }
      },
      // About a screen ahead, so the next rows (and their pictures) are ready before they scroll in.
      { root: scrollParent(node), rootMargin: "100% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, total, batch]);

  if (total === 0) return null;

  const gameSlice = list.slice(0, Math.max(0, visible - lead));

  return (
    <section className={s.reveal}>
      <SectionHead
        icon={IconRocket}
        title="Newest games"
        tools={
          <HomeLink href={filtersHref({ view: "new", browse: true })} className={s.seeAll}>
            See all
          </HomeLink>
        }
      />
      <div className={s.newestGrid}>
        {publishSlot ? <SlotCard slot={1} /> : null}
        {gameSlice.map((g, i) => (
          <TallCard key={g.id} game={g} i={i + lead} priority={i < 6} />
        ))}
        {visible < total ? <div ref={sentinelRef} className={s.newestSentinel} aria-hidden /> : null}
      </div>
    </section>
  );
}
