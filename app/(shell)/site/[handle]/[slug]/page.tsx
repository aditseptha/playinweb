import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InlineAlert } from "@/components/ds/feedback";
import { GameDetail } from "@/components/GameDetail";
import { HomeShell } from "@/components/home/HomeShell";
import { gameJsonLdHtml, gameMetadata, getCreatorGameCount, getGameByHandleSlug } from "@/lib/game-page";
import { isCuratedHandle } from "@/lib/curation";
import { apexHref } from "@/lib/host";

type Props = { params: Promise<{ handle: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, slug } = await params;
  const project = await getGameByHandleSlug(handle, slug);
  return project ? gameMetadata(project) : {};
}

export default async function SiteProjectPage({ params }: Props) {
  const { handle, slug } = await params;
  const project = await getGameByHandleSlug(handle, slug);
  if (!project || !project.profiles) notFound();
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
              title={isCuratedHandle(handle) ? "Draft · Only admins can see this page" : "Draft · Only you can see this page"}
              action={
                isCuratedHandle(handle) ? (
                  // Curated games (#9) are edited by admins in the Curated games tab.
                  <Link
                    href={apexHref(`/admin?tab=curated&edit=${project.id}`)}
                    className="font-semibold underline underline-offset-4"
                  >
                    Publish it in Curated games
                  </Link>
                ) : (
                  <Link href={apexHref(`/manage/${project.id}`)} className="font-semibold underline underline-offset-4">
                    Publish it in Manage games
                  </Link>
                )
              }
            />
          )
        }
      />
    </HomeShell>
  );
}
