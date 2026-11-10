"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProjectForm } from "@/components/ProjectForm";
import { Button } from "@/components/ds/button";
import { StatusPage } from "@/components/ds/empty-state";
import { FormSkeleton } from "@/components/ds/skeleton";
import { useLoginDialog } from "@/components/LoginDialog";
import s from "@/components/home/home.module.css";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";
import { apexHref } from "@/lib/host";
import { fetchProjectById, type ProjectRecord } from "@/lib/projects";

export function EditGameScreen() {
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

  let title = "Edit game";
  let missing = false;
  let body = <FormSkeleton label="Loading game" fields={6} />;

  if (!loading && project !== undefined && !user) {
    body = (
      <>
        <p className={s.legalIntro}>Sign in to edit your listing.</p>
        <div className={s.manageActions} style={{ marginTop: 22 }}>
          <button type="button" className={cn(s.btn, s.btnPrimary)} onClick={() => openLogin()}>
            Sign in
          </button>
        </div>
      </>
    );
  } else if (!loading && project !== undefined && user && (!project || project.owner_id !== user.id)) {
    title = "Game not found";
    missing = true;
    body = (
      <StatusPage
        status="not-found"
        title="Game not found"
        body="This listing is missing, or it isn’t yours."
        fullHeight={false}
        actions={
          <Button variant="primary" asChild>
            <Link href={apexHref("/manage")}>Back to manage games</Link>
          </Button>
        }
      />
    );
  } else if (!loading && project && user && project.owner_id === user.id) {
    title = `Edit ${project.title}`;
    body = (
      <>
        <p className={s.legalIntro}>
          <Link href={apexHref("/manage")}>Manage games</Link>
          <span aria-hidden> · </span>
          Update the listing. Views stay as they are.
        </p>
        <div className={s.createForm}>
          <ProjectForm project={project} />
        </div>
      </>
    );
  }

  return (
    <div className={`${s.create} ${s.pageSkin}`}>
      <div className={s.frame}>
        <div className={s.wrap}>
          {missing ? (
            body
          ) : (
            <>
              <p className={s.eyebrow}>Creator</p>
              <h1 className={s.createTitle}>{title}</h1>
              {body}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
