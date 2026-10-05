import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { countProfiles, fetchCatalogueGames } from "@/lib/projects";
import { HomeView } from "./HomeView";

// ponytail: unstable_cache is superseded by "use cache"; switch once cacheComponents is enabled.
const homeData = unstable_cache(
  async () => {
    const [games, players] = await Promise.all([fetchCatalogueGames({ force: true }), countProfiles()]);
    return { games, players };
  },
  ["home-data"],
  { revalidate: 60 },
);

export default async function HomePage() {
  // AppShell reads search params, so a static prerender would bail out to an empty shell.
  await connection();
  const { games, players } = await homeData();
  return <HomeView initialGames={games} players={players} />;
}
