import { byPopularity } from "@/components/home/filters";
import type { Game } from "@/lib/types";

export const HERO_SPOTLIGHT_MAX = 12;

/** Ordered hero slides: admin picks first, else top played creator games. */
export function pickHeroGames(ids: string[], catalogue: Game[], limit = 5): Game[] {
  const own = catalogue.filter((g) => !g.curated);
  const byId = new Map(own.map((g) => [g.id, g]));
  const picked = ids.flatMap((id) => {
    const game = byId.get(id);
    return game ? [game] : [];
  });
  if (picked.length > 0) return picked.slice(0, HERO_SPOTLIGHT_MAX);
  return byPopularity(own).slice(0, Math.min(limit, HERO_SPOTLIGHT_MAX));
}
