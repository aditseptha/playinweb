import { connection } from "next/server";
import { homeData } from "./home-data";
import { HomeView } from "./HomeView";

export default async function HomePage() {
  // AppShell reads search params, so a static prerender would bail out to an empty shell.
  await connection();
  const { games, players } = await homeData();
  return <HomeView initialGames={games} players={players} />;
}
