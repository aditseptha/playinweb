"use client";

import Image from "next/image";
import { useState } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { GameCard } from "@/components/GameCard";
import { IconCalendar, IconClock, IconTrophy } from "@/components/icons";
import { RankRow } from "@/components/RankRow";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { maxPopularity, periodScore, type PlayRange } from "@/lib/popularity";
import { useGames } from "@/lib/store";
import type { Game } from "@/lib/types";

const RANGES: { value: PlayRange; label: React.ReactNode }[] = [
  {
    value: "all",
    label: (
      <>
        <IconTrophy className="h-3.5 w-3.5 shrink-0" />
        All time
      </>
    ),
  },
  {
    value: "day",
    label: (
      <>
        <IconCalendar className="h-3.5 w-3.5 shrink-0" />
        Day
      </>
    ),
  },
  {
    value: "week",
    label: (
      <>
        <IconClock className="h-3.5 w-3.5 shrink-0" />
        Week
      </>
    ),
  },
];

export default function TopPage() {
  const { games } = useGames();
  const [range, setRange] = useState<PlayRange>("all");
  const ranked = [...games].sort((a, b) => periodScore(b, range) - periodScore(a, range));
  const max = maxPopularity(games);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <FeatureGate id="top">
    <div className="flex min-w-0 flex-col gap-8 rounded-t-2xl bg-[linear-gradient(180deg,var(--surface-3)_0%,var(--bg)_36rem)]">
      <section className="relative isolate mx-1 mt-1 overflow-hidden rounded-2xl">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Image
            src="/top-hero.webp"
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.16_0.03_250_/_0.78)_0%,oklch(0.18_0.03_250_/_0.42)_28%,oklch(0.2_0.03_250_/_0.12)_48%,transparent_62%)]" />
        </div>
        <div className="absolute right-3 top-3 z-20 sm:right-4 sm:top-4">
          <Segmented
            aria-label="Ranking period"
            size="lg"
            className="border border-border shadow-panel"
            value={range}
            onChange={setRange}
            options={RANGES}
          />
        </div>
        <div className="relative z-10 flex h-[132px] items-center justify-center px-6 pb-10 pt-8 sm:h-[148px] lg:h-[160px]">
          <h1 className="text-center text-[36px] font-semibold leading-none tracking-tight text-white [text-shadow:0_1px_2px_oklch(0_0_0_/_0.45),0_12px_28px_oklch(0_0_0_/_0.28)] sm:text-[48px]">
            Top played
          </h1>
        </div>
      </section>

      <Podium games={podium} max={max} />

      <ol className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        {rest.map((game, i) => (
          <li key={game.id}>
            <RankRow game={game} rank={i + 4} maxScore={max} />
          </li>
        ))}
      </ol>
    </div>
    </FeatureGate>
  );
}

function Podium({ games, max }: { games: Game[]; max: number }) {
  const [first, second, third] = games;
  const slots = [
    { game: second, rank: 2, center: false },
    { game: first, rank: 1, center: true },
    { game: third, rank: 3, center: false },
  ].filter((slot) => slot.game);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 pt-4 sm:gap-8 md:flex-row md:items-end md:justify-center">
      {slots.map(({ game, rank, center }) => (
        <div
          key={game!.id}
          className={cn(
            "min-w-0 w-full",
            center
              ? "order-first max-w-[18rem] sm:max-w-[20rem] md:order-none md:max-w-[22rem]"
              : "max-w-[15rem] sm:max-w-[16.5rem] md:mb-6 md:max-w-[18rem]",
          )}
        >
          <span className="sr-only">Rank {rank}</span>
          <GameCard game={game!} maxScore={max} variant="thumb" priority={center} rank={rank} />
        </div>
      ))}
    </div>
  );
}
