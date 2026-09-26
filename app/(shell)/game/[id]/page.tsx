import { notFound } from "next/navigation";
import { GameDetail } from "@/components/GameDetail";
import { WithAppShell } from "@/components/WithAppShell";
import { fetchProjectById } from "@/lib/projects";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await fetchProjectById(id);
  if (!project) notFound();

  return (
    <WithAppShell>
      <GameDetail project={project} />
    </WithAppShell>
  );
}
