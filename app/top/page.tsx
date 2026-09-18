"use client";

import { useState } from "react";
import { FeatureGate } from "@/components/FeatureGate";
import { GameCard } from "@/components/GameCard";
import { RankRow } from "@/components/RankRow";
import { Segmented } from "@/components/ui/segmented";
import { maxPopularity, periodScore, type PlayRange } from "@/lib/popularity";
import { useGames } from "@/lib/store";

const RANGES: { value: PlayRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
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
    <div className="mx-auto min-w-0 max-w-[1400px]">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-display font-semibold tracking-tight">Top played</h1>
          <p className="mt-1.5 max-w-2xl text-body leading-relaxed text-text-muted">
            Ranked by plays. Day and week lift newer games so recent hits can rise.
          </p>
        </div>
        <Segmented
          aria-label="Ranking period"
          value={range}
          onChange={setRange}
          options={RANGES}
        />
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {podium.map((game, i) => (
          <div key={game.id} className="flex min-w-0 items-start gap-3">
            <span className="sr-only">Rank {i + 1}</span>
            <span
              className="w-10 shrink-0 text-[44px] font-semibold leading-none tracking-tight tabular sm:w-12 sm:text-[56px]"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <GameCard game={game} maxScore={max} />
            </div>
          </div>
        ))}
      </div>

      <ol className="mt-12 divide-y divide-border overflow-hidden rounded-panel bg-surface">
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
