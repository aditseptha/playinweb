"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProjectForm } from "@/components/ProjectForm";
import { useLoginDialog } from "@/components/LoginDialog";
import { Button, LinkButton } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { apexHref } from "@/lib/host";
import { fetchProjectById, type ProjectRecord } from "@/lib/projects";

export default function EditGamePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const [project, setProject] = useState<ProjectRecord | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchProjectById(id).then((row) => {
      if (!cancelled) setProject(row);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading || project === undefined) {
    return <p className="text-ui text-text-muted">Loading game…</p>;
  }

  if (!user) {
    return (
      <div className="min-w-0 pt-4">
        <h1 className="text-display font-semibold tracking-tight">Edit game</h1>
        <p className="mt-1.5 text-body text-text-muted">Sign in to edit your listing.</p>
        <div className="mt-6">
          <Button type="button" variant="primary" size="sm" onClick={() => openLogin()}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (!project || project.owner_id !== user.id) {
    return (
      <div className="min-w-0 pt-4">
        <h1 className="text-display font-semibold tracking-tight">Game not found</h1>
        <p className="mt-1.5 text-body text-text-muted">This listing is missing, or it isn’t yours.</p>
        <div className="mt-6">
          <LinkButton href={apexHref("/manage")} variant="secondary" size="sm">
            Back to manage games
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <div className="min-w-0">
        <p className="text-caption text-text-muted">
          <Link href={apexHref("/manage")} className="hover:text-text">
            Manage games
          </Link>
          <span aria-hidden> / </span>
          Edit
        </p>
        <h1 className="mt-2 text-display font-semibold tracking-tight">Edit {project.title}</h1>
        <p className="mt-1.5 max-w-2xl text-body leading-relaxed text-text-muted">
          Update the listing. Views stay as they are.
        </p>
      </div>
      <div className="mt-8">
        <ProjectForm project={project} />
      </div>
    </div>
  );
}
