// Search and sharing text for game pages. No imports, so `node --test` can load this file directly.

export type GameSeoInput = {
  title: string;
  tagline?: string | null;
  description?: string | null;
  creatorName: string;
  creatorUrl: string;
  /** Canonical page URL, absolute. */
  url: string;
  /** Cover image URL, absolute. */
  image?: string | null;
  genre?: string | null;
  plays: number;
  /** ISO date the game was first published. */
  publishedAt: string;
};

/** Search results cut descriptions around 155–160 characters. */
const DESCRIPTION_MAX = 160;

/** "{Title} by {Creator}". The root layout's template adds " · PlayInWeb". */
export function gameTitle(title: string, creatorName: string) {
  const name = squash(title) || "Untitled game";
  const creator = squash(creatorName);
  return creator ? `${name} by ${creator}` : name;
}

/** The tagline, else the start of the description, on one line and cut at a word. */
export function gameDescription(input: Pick<GameSeoInput, "title" | "tagline" | "description">) {
  const text = squash(input.tagline) || squash(input.description);
  if (!text) return `Play ${squash(input.title) || "this game"} free in your browser on PlayInWeb.`;
  return clip(text, DESCRIPTION_MAX);
}

/** schema.org VideoGame data for search engines. */
export function gameJsonLd(input: GameSeoInput) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: squash(input.title) || "Untitled game",
    url: input.url,
    description: gameDescription(input),
    ...(input.image ? { image: input.image } : {}),
    ...(input.genre ? { genre: input.genre } : {}),
    gamePlatform: "Web browser",
    applicationCategory: "Game",
    datePublished: input.publishedAt,
    author: { "@type": "Person", name: squash(input.creatorName) || "Creator", url: input.creatorUrl },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/PlayAction",
      userInteractionCount: Math.max(0, Math.round(input.plays) || 0),
    },
  };
}

/**
 * JSON for a `<script type="application/ld+json">`. Creators write the title and description, so
 * `<` is escaped: otherwise a title containing `</script>` could end the tag and inject markup.
 */
export function jsonLdHtml(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Adds the request's query (for example `?play=1`) to an absolute URL. */
export function withSearch(url: string, search: Record<string, string | string[] | undefined>) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) continue;
    for (const one of Array.isArray(value) ? value : [value]) target.searchParams.append(key, one);
  }
  return target.toString();
}

/** Creators and games for the sitemap, from published game rows. Each creator appears once. */
export function sitemapPaths(rows: { handle?: string | null; slug?: string | null }[]) {
  const creators = new Set<string>();
  const games: { handle: string; slug: string }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.handle) continue;
    creators.add(row.handle);
    if (!row.slug) continue;
    const key = `${row.handle}/${row.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    games.push({ handle: row.handle, slug: row.slug });
  }
  return { creators: [...creators], games };
}

function squash(text?: string | null) {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${base.replace(/[\s.,;:!?-]+$/, "")}…`;
}
