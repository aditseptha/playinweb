import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { GameDetail } from "@/components/GameDetail";
import { WithAppShell } from "@/components/WithAppShell";
import { gameCanonicalUrl, gameMetadata, getGameById } from "@/lib/game-page";
import { withSearch } from "@/lib/game-seo";

// Old address for a game. Games with a creator handle and slug redirect to /{handle}/{slug}.
// There is deliberately no loading.tsx here: with one, the page streams and redirect() becomes a
// <meta> refresh with status 200 instead of an HTTP 307 that search engines follow.
// The redirect is temporary (307) until it has proved itself in production; then use permanentRedirect.

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = await getGameById(id);
  return project ? gameMetadata(project) : {};
}

export default async function GamePage({ params, searchParams }: Props) {
  const { id } = await params;
  const project = await getGameById(id);
  if (!project) notFound();

  const canonical = gameCanonicalUrl(project);
  if (canonical) redirect(withSearch(canonical, await searchParams));

  return (
    <WithAppShell>
      <GameDetail project={project} />
    </WithAppShell>
  );
}
