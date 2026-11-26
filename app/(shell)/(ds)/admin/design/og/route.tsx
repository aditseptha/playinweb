import { gameOgImage, siteOgImage } from "@/lib/og";

// Sample link previews for /admin/design: ?kind=site or ?kind=game (&long=1 for a worst-case title,
// &award=1 for a Best of PlayInWeb winner).
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("kind") !== "game") return siteOgImage();
  const long = url.searchParams.get("long") === "1";
  return gameOgImage({
    title: long
      ? "The Extraordinarily Long and Winding Adventures of Si Kancil and the Seven Crocodiles"
      : "Ayam Kabur",
    creator: long ? "nusantara.interactive.collective" : "kikiew",
    plays: long ? 98_765_432 : 12_400,
    // A PNG from /public, so the sample shows a cover (Satori can't read WebP).
    coverUrl: `${url.origin}/sidebar-footer.png`,
    award: url.searchParams.get("award") === "1" ? "Best of PlayInWeb" : null,
  });
}
