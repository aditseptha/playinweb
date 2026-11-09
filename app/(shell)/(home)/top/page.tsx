import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { fetchCatalogueGames } from "@/lib/projects";
import { RankingsView } from "./RankingsView";

export const metadata: Metadata = {
  title: "Rankings",
  description: "The most played indie browser games on PlayInWeb, all time and trending today or this week.",
};

// Same cache as the homepage, so both pages read one catalogue fetch.
// ponytail: unstable_cache is superseded by "use cache"; switch once cacheComponents is enabled.
const rankingGames = unstable_cache(() => fetchCatalogueGames({ force: true }), ["home-games"], { revalidate: 60 });

export default async function TopPage() {
  // Rendered per request like the homepage, so a build never needs the catalogue.
  await connection();
  const games = await rankingGames();
  return <RankingsView initialGames={games} />;
}
