import { unstable_cache } from "next/cache";
import { countProfiles, fetchCatalogueGames } from "@/lib/projects";

// ponytail: unstable_cache is superseded by "use cache"; switch once cacheComponents is enabled.
export const homeData = unstable_cache(
  async () => {
    const [games, players] = await Promise.all([fetchCatalogueGames({ force: true }), countProfiles()]);
    return { games, players };
  },
  ["home-data"],
  { revalidate: 60 },
);
