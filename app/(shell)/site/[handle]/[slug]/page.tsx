import { notFound } from "next/navigation";
import { GameDetail } from "@/components/GameDetail";
import { WithAppShell } from "@/components/WithAppShell";
import { fetchProjectByHandleSlug } from "@/lib/projects";

export default async function SiteProjectPage({ params }: { params: Promise<{ handle: string; slug: string }> }) {
  const { handle, slug } = await params;
  const project = await fetchProjectByHandleSlug(handle, slug);
  if (!project || !project.profiles) notFound();

  return (
    <WithAppShell>
      <GameDetail project={project} />
    </WithAppShell>
  );
}
