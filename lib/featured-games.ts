import { byPopularity } from "@/components/home/filters";
import type { Game } from "@/lib/types";

export const FEATURED_GAMES_MAX = 12;

function resolvePicks(order: string[], byId: Map<string, Game>) {
  return order.flatMap((id) => {
    const game = byId.get(id);
    return game ? [game] : [];
  });
}

/** Ordered featured row: admin featured picks, else hero picks, else top played creator games. */
export function pickFeaturedGames(ids: string[], catalogue: Game[], heroIds: string[] = []): Game[] {
  const own = catalogue.filter((g) => !g.curated);
  const byId = new Map(own.map((g) => [g.id, g]));
  const picked = resolvePicks(ids, byId);
  if (picked.length > 0) return picked.slice(0, FEATURED_GAMES_MAX);
  const fromHero = resolvePicks(heroIds, byId);
  if (fromHero.length > 0) return fromHero.slice(0, FEATURED_GAMES_MAX);
  return byPopularity(own).slice(0, FEATURED_GAMES_MAX);
}
