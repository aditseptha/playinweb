import { unstable_cache } from "next/cache";
import { fetchCatalogueGames } from "@/lib/projects";

// ponytail: unstable_cache is superseded by "use cache"; switch once cacheComponents is enabled.
/** Catalogue for the homepage (/) and the console home (/home-v2), shared so both hit one cache. */
export const homeData = unstable_cache(
  async () => {
    const games = await fetchCatalogueGames({ force: true });
    return { games };
  },
  ["home-data"],
  { revalidate: 60 },
);
