import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { InlineAlert } from "@/components/ds/feedback";
import { GameDetail } from "@/components/GameDetail";
import { HomeShell } from "@/components/home/HomeShell";
import { gameJsonLdHtml, gameMetadata, getCreatorGameCount, getGameByHandleSlug, getSlugRedirect } from "@/lib/game-page";
import { withSearch } from "@/lib/game-seo";
import { apexHref } from "@/lib/host";

// There is deliberately no loading.tsx here: with one, the page streams before the game is looked up,
// so a missing game answers 200 instead of 404 and an old address gets a <meta> refresh instead of a 308.

type Props = {
  params: Promise<{ handle: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const project = await getGameByHandleSlug(handle, slug);
  return project ? gameMetadata(project) : {};
}

export default async function SiteProjectPage({ params, searchParams }: Props) {
  const { handle, slug } = await params;
  const project = await getGameByHandleSlug(handle, slug);
  if (!project || !project.profiles) {
    // The game may have moved: a renamed slug keeps its old address as a permanent redirect.
    const moved = await getSlugRedirect(handle, slug);
    if (moved) permanentRedirect(withSearch(moved, await searchParams));
    notFound();
  }
  const creatorGameCount = await getCreatorGameCount(project.owner_id);
  const jsonLd = gameJsonLdHtml(project);

  return (
    <HomeShell>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}
      <GameDetail
        project={project}
        creatorGameCount={creatorGameCount}
        notice={
          project.published ? null : (
            // Row-level security only returns an unpublished game to its owner.
            <InlineAlert
              tone="warning"
              title="Draft · Only you can see this page"
              action={
                <Link href={apexHref(`/manage/${project.id}`)} className="font-semibold underline underline-offset-4">
                  Publish it in Manage games
                </Link>
              }
            />
          )
        }
      />
    </HomeShell>
  );
}
