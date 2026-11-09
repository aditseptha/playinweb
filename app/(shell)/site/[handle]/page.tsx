import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeShell } from "@/components/home/HomeShell";
import { isCuratedHandle } from "@/lib/curation";
import { fetchProjectsForHandle, projectToGame } from "@/lib/projects";
import { CreatorSiteView } from "./CreatorSiteView";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function CreatorSitePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  // The `listed` system account owns curated games (#9); it has no creator page.
  if (isCuratedHandle(handle)) notFound();
  const { profile, projects } = await fetchProjectsForHandle(handle);
  if (!profile) notFound();

  const games = projects.map(projectToGame);
  return (
    <HomeShell>
      <CreatorSiteView profile={profile} games={games} />
    </HomeShell>
  );
}
