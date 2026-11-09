// Shelves under a game: "More from {creator}" and "Similar games". No imports, so `node --test` can
// load this file directly.

type Item = { id: string; tags: string[]; playCount: number; channelHandle?: string; developer: string };

function sameCreator(a: Item, b: Item) {
  return a.channelHandle && b.channelHandle ? a.channelHandle === b.channelHandle : a.developer === b.developer;
}

/** The creator's other games, most played first. */
export function moreFromCreator<T extends Item>(games: T[], current: Item, limit = 4): T[] {
  return games
    .filter((g) => g.id !== current.id && sameCreator(g, current))
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit);
}

/**
 * Games by other creators that share at least one tag, most shared tags first, then most played.
 * When fewer than `minimum` match, the shelf becomes "Popular games": the most played games by
 * other creators, so the page never shows a "similar" shelf of unrelated games.
 */
export function similarGames<T extends Item>(games: T[], current: Item, limit = 6, minimum = 3) {
  const tags = new Set(current.tags.map((t) => t.toLowerCase()));
  const others = games.filter((g) => g.id !== current.id && !sameCreator(g, current));
  const matches = others
    .map((g) => ({ g, overlap: g.tags.filter((t) => tags.has(t.toLowerCase())).length }))
    .filter((m) => m.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.g.playCount - a.g.playCount)
    .map((m) => m.g);
  if (matches.length >= minimum) return { kind: "similar" as const, games: matches.slice(0, limit) };
  const popular = [...others].sort((a, b) => b.playCount - a.playCount).slice(0, limit);
  return { kind: "popular" as const, games: popular };
}
