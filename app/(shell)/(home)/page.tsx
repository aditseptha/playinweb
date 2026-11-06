import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { fetchCatalogueGames } from "@/lib/projects";
import { HomeView } from "./HomeView";

// ponytail: unstable_cache is superseded by "use cache"; switch once cacheComponents is enabled.
const homeGames = unstable_cache(() => fetchCatalogueGames({ force: true }), ["home-games"], { revalidate: 60 });

export default async function HomePage() {
  // HomeView reads search params, so a static prerender would bail out to an empty shell.
  await connection();
  const games = await homeGames();
  return <HomeView initialGames={games} />;
}
