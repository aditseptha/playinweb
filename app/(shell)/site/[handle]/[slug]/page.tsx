import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GameDetail } from "@/components/GameDetail";
import { WithAppShell } from "@/components/WithAppShell";
import { gameJsonLdHtml, gameMetadata, getGameByHandleSlug } from "@/lib/game-page";
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
  const jsonLd = gameJsonLdHtml(project);

  return (
    <WithAppShell>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}
      {project.published ? null : (
        // Row-level security only returns an unpublished game to its owner.
        <p role="status" className="mb-3 rounded-xl bg-surface-2 px-4 py-3 text-ui text-text-muted">
          <span className="font-medium text-text">Draft</span> · Only you can see this page.{" "}
          <Link href={apexHref(`/manage/${project.id}`)} className="font-medium text-text underline-offset-4 hover:underline">
            Publish it in Manage games
          </Link>
        </p>
      )}
      <GameDetail project={project} />
    </WithAppShell>
  );
}
