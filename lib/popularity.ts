import type { Game } from "./types";

export type PlayRange = "all" | "day" | "week";

export function popularityScore(game: Game): number {
  return game.playCount + game.promotionBoost;
}

export function maxPopularity(games: Game[]): number {
  return Math.max(1, ...games.map(popularityScore));
}

/** Play count shown for the selected rankings period (stat-day totals or all-time plays). */
export function playsForRange(
  game: Game,
  range: PlayRange,
  periods: { daily: Record<string, number>; weekly: Record<string, number> },
): number {
  if (range === "all") return game.playCount;
  if (range === "week") return periods.weekly[game.id] ?? 0;
  return periods.daily[game.id] ?? 0;
}

/** Sort key for the rankings list (all-time still respects promotion boost). */
export function rankScoreForRange(
  game: Game,
  range: PlayRange,
  periods: { daily: Record<string, number>; weekly: Record<string, number> },
): number {
  if (range === "all") return popularityScore(game);
  return playsForRange(game, range, periods);
}

/** @deprecated Rankings use `playsForRange` with stat-day totals. */
export function periodScore(game: Game, range: PlayRange): number {
  const base = popularityScore(game);
  if (range === "all") return base;
  const ageMs = Date.now() - new Date(game.createdAt).getTime();
  const halfLife = range === "day" ? 86_400_000 : 7 * 86_400_000;
  return base * Math.exp(-Math.max(0, ageMs) / halfLife);
}
