import type { Metadata } from "next";
import { connection } from "next/server";
import { HomeConsole } from "@/components/HomeConsole";
import { homeData } from "../(main)/home-data";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false },
};

export default async function HomeV2Page() {
  // Matches the classic home: render per request so the catalogue isn't fetched at build time.
  await connection();
  const { games } = await homeData();
  return <HomeConsole initialGames={games} />;
}
