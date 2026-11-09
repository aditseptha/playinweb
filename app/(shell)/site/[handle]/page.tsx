import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeShell } from "@/components/home/HomeShell";
import { fetchProjectsForHandle, projectToGame } from "@/lib/projects";
import { CreatorSiteView } from "./CreatorSiteView";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function CreatorSitePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { profile, projects } = await fetchProjectsForHandle(handle);
  if (!profile) notFound();

  const games = projects.map(projectToGame);
  return (
    <HomeShell>
      <CreatorSiteView profile={profile} games={games} />
    </HomeShell>
  );
}
