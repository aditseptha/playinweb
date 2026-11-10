"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProjectForm } from "@/components/ProjectForm";
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
  let body = <p className={s.legalIntro}>Loading game…</p>;

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
    body = (
      <>
        <p className={s.legalIntro}>This listing is missing, or it isn’t yours.</p>
        <div className={s.manageActions} style={{ marginTop: 22 }}>
          <Link href={apexHref("/manage")} className={cn(s.btn, s.btnGhost)}>
            Back to manage games
          </Link>
        </div>
      </>
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
    <div className={s.create}>
      <div className={s.frame}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>Creator</p>
          <h1 className={s.createTitle}>{title}</h1>
          {body}
        </div>
      </div>
    </div>
  );
}
