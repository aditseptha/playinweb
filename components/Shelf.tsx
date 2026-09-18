import type { ReactNode } from "react";
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
    <section className="min-w-0">
      <div className="mb-4 flex items-center gap-2">
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
  variant?: "rail" | "promo" | "mini";
  onRemove?: (id: string) => void;
}) {
  if (games.length === 0) return null;
  return (
    <div className={cn("scrollbar-hide flex w-full min-w-0 overflow-x-auto pb-2 snap-x snap-mandatory", variant === "mini" ? "gap-3" : "gap-5")}>
      {games.map((game, i) => (
        <div key={game.id} className="relative shrink-0">
          <GameCard
            game={game}
            maxScore={maxScore}
            variant={variant}
            priority={variant === "promo" && i < 3}
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
  );
}
