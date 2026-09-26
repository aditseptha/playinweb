"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { IconChevron, IconClose } from "@/components/icons";
import { cn } from "@/lib/cn";
import type { Game } from "@/lib/types";

export function Shelf({
  title,
  href,
  hrefLabel = "See all",
  children,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="relative z-10 flex items-center gap-2">
        <h2 className="text-heading font-semibold tracking-tight">{title}</h2>
        {href ? (
          <Link
            href={href}
            className="ml-auto grid size-9 place-items-center rounded-lg text-text hover:bg-surface-2"
            aria-label={hrefLabel}
          >
            <IconChevron className="h-5 w-5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function GameRail({
  games,
  maxScore,
  variant = "rail",
  onRemove,
}: {
  games: Game[];
  maxScore: number;
  variant?: "rail" | "mini";
  onRemove?: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    function update() {
      const node = scroller.current;
      if (!node) return;
      const max = node.scrollWidth - node.clientWidth;
      setFade({
        left: node.scrollLeft > 8,
        right: max > 8 && node.scrollLeft < max - 8,
      });
    }

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [games.length]);

  if (games.length === 0) return null;

  return (
    <div className="relative min-w-0 -my-6">
      <div
        ref={scroller}
        className={cn(
          "scrollbar-hide flex w-full min-w-0 overflow-x-auto px-2 py-6 snap-x snap-mandatory",
          variant === "mini" ? "gap-3" : "gap-5",
        )}
      >
        {games.map((game, i) => (
          <div key={game.id} className="relative shrink-0">
            <GameCard
              game={game}
              maxScore={maxScore}
              variant={variant}
              priority={variant === "rail" && i < 3}
            />
            {onRemove ? (
              <button
                type="button"
                className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
                aria-label={`Remove ${game.title} from play history`}
                onClick={() => onRemove(game.id)}
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute top-6 bottom-6 left-0 z-0 w-14 bg-gradient-to-r from-bg to-transparent transition-opacity",
          fade.left ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute top-6 bottom-6 right-0 z-0 w-14 bg-gradient-to-l from-bg to-transparent transition-opacity",
          fade.right ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
