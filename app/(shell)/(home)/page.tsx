import { connection } from "next/server";
import { homeData } from "../(main)/home-data";
import { HomeView } from "./HomeView";

export default async function HomePage() {
  // HomeView reads search params, so a static prerender would bail out to an empty shell.
  await connection();
  const { games } = await homeData();
  return <HomeView initialGames={games} />;
}
