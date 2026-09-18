import type { Game } from "./types";

export type PlayRange = "all" | "day" | "week";

export function popularityScore(game: Game): number {
  return game.playCount + game.promotionBoost;
}

export function maxPopularity(games: Game[]): number {
  return Math.max(1, ...games.map(popularityScore));
}

export function periodScore(game: Game, range: PlayRange): number {
  const base = popularityScore(game);
  if (range === "all") return base;
  const ageMs = Date.now() - new Date(game.createdAt).getTime();
  const halfLife = range === "day" ? 86_400_000 : 7 * 86_400_000;
  return base * Math.exp(-Math.max(0, ageMs) / halfLife);
}
