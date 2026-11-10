import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { fetchFeaturedGameIds } from "@/lib/featured-games.server";
import { fetchHeroSpotlightIds } from "@/lib/hero-spotlights.server";
import { fetchCatalogueGames, fetchCatalogueWeeklyPlays } from "@/lib/projects";
import { HomeView } from "./HomeView";

// ponytail: unstable_cache is superseded by "use cache"; switch once cacheComponents is enabled.
const homeGames = unstable_cache(() => fetchCatalogueGames({ force: true }), ["home-games"], { revalidate: 60 });
const weeklyPlays = unstable_cache(() => fetchCatalogueWeeklyPlays(), ["home-weekly-plays"], { revalidate: 60 });

export default async function HomePage() {
  // HomeView reads search params, so a static prerender would bail out to an empty shell.
  await connection();
  const [games, spotlightIds, weekly, featuredIds] = await Promise.all([
    homeGames(),
    fetchHeroSpotlightIds(),
    weeklyPlays(),
    fetchFeaturedGameIds(),
  ]);
  return (
    <HomeView initialGames={games} heroSpotlightIds={spotlightIds} featuredGameIds={featuredIds} weeklyPlays={weekly} />
  );
}
