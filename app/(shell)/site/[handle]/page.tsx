import { notFound } from "next/navigation";
import { WithAppShell } from "@/components/WithAppShell";
import { fetchProjectsForHandle, projectToGame } from "@/lib/projects";
import { CreatorSiteView } from "./CreatorSiteView";

export default async function CreatorSitePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { profile, projects } = await fetchProjectsForHandle(handle);
  if (!profile) notFound();

  const games = projects.map(projectToGame);
  return (
    <WithAppShell>
      <CreatorSiteView profile={profile} games={games} />
    </WithAppShell>
  );
}
