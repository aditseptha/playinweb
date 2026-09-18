"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GameDetail } from "@/components/GameDetail";
import { LinkButton } from "@/components/ui/button";
import {
  fetchProjectByHandleSlug,
  fetchProjectById,
  gameToProjectRecord,
  type ProjectRecord,
} from "@/lib/projects";
import { useGames } from "@/lib/store";

export default function GamePage() {
  const { id } = useParams<{ id: string }>();
  const { games } = useGames();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = games.find((g) => g.id === id);

    async function load() {
      if (local?.channelHandle && local.projectSlug) {
        const row = await fetchProjectByHandleSlug(local.channelHandle, local.projectSlug);
        if (!cancelled) {
          setProject(row ?? gameToProjectRecord(local));
          setLoaded(true);
        }
        return;
      }
      const row = await fetchProjectById(id);
      if (!cancelled) {
        setProject(row ?? (local ? gameToProjectRecord(local) : null));
        setLoaded(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, games]);

  if (!loaded) return <p className="text-ui text-text-muted">Loading…</p>;
  if (!project) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-heading font-semibold">Game not found</h1>
        <p className="mt-2 text-sm text-muted">
          It may have been removed, or this link is from another browser profile.
        </p>
        <LinkButton href="/" variant="primary" className="mt-6">
          Back to catalogue
        </LinkButton>
      </div>
    );
  }

  return <GameDetail project={project} />;
}
