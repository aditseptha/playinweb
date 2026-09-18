"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GameDetail } from "@/components/GameDetail";
import { LinkButton } from "@/components/ui/button";
import { fetchProjectByHandleSlug, type ProjectRecord } from "@/lib/projects";

export default function SiteProjectPage() {
  const { handle, slug } = useParams<{ handle: string; slug: string }>();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProjectByHandleSlug(handle, slug).then((row) => {
      if (cancelled) return;
      setProject(row);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [handle, slug]);

  if (!loaded) return <p className="text-ui text-text-muted">Loading…</p>;
  if (!project || !project.profiles) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-heading font-semibold">Game not found</h1>
        <LinkButton href="/" variant="primary" className="mt-6">
          Back to catalogue
        </LinkButton>
      </div>
    );
  }

  return <GameDetail project={project} />;
}
