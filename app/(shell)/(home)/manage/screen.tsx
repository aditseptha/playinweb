"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ds/empty-state";
import { Button } from "@/components/ds/button";
import { DashboardSkeleton } from "@/components/ds/skeleton";
import { ManageStats } from "@/components/ManageStats";
import { useLoginDialog } from "@/components/LoginDialog";
import { useSignupDialog } from "@/components/SignupDialog";
import s from "@/components/home/home.module.css";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth";
import { formatPlays } from "@/lib/format";
import { apexHref } from "@/lib/host";
import { fetchOwnerStatDays, fetchProjectsForOwner, type ProjectRecord, type StatDay } from "@/lib/projects";

function sinceDay(days: number) {
  const n = new Date();
  n.setUTCDate(n.getUTCDate() - days);
  return n.toISOString().slice(0, 10);
}

export function ManageScreen() {
  const { user, profile, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  const [loaded, setLoaded] = useState<{ uid: string; projects: ProjectRecord[]; days: StatDay[] } | null>(null);
  const current = user && loaded?.uid === user.id ? loaded : null;
  const projects = current?.projects ?? null;
  const days = current?.days ?? [];

  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    let cancelled = false;
    async function load() {
      const [rows, stats] = await Promise.all([fetchProjectsForOwner(uid), fetchOwnerStatDays(sinceDay(56))]);
      if (!cancelled) setLoaded({ uid, projects: rows, days: stats });
    }
    void load();
    function onShow() {
      if (document.visibilityState === "visible") void load();
    }
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [user]);

  const totalViews = (projects ?? []).reduce((n, p) => n + (p.view_count ?? 0), 0);
  const totalPlays = (projects ?? []).reduce((n, p) => n + Math.min(p.play_count, p.view_count ?? 0), 0);

  let body = <DashboardSkeleton label="Loading account" />;
  if (!loading && (!user || !profile)) {
    body = (
      <>
        <p className={s.legalIntro}>Sign in to see views and edit your listings.</p>
        <div className={s.manageActions} style={{ marginTop: 22 }}>
          <button type="button" className={cn(s.btn, s.btnPrimary)} onClick={() => openLogin()}>
            Sign in
          </button>
          <button type="button" className={cn(s.btn, s.btnGhost)} onClick={() => openSignup()}>
            Create account
          </button>
        </div>
      </>
    );
  } else if (!loading && user && profile) {
    body = (
      <>
        {projects === null ? (
          <DashboardSkeleton label="Loading your listings" />
        ) : projects.length === 0 ? (
          <EmptyState
            kind="first-use"
            illustration="first-use"
            title="No games yet"
            body="Publish a listing and it will show up here with view counts."
            action={
              <Button variant="primary" asChild>
                <Link href={apexHref("/register")}>Create a game</Link>
              </Button>
            }
          />
        ) : (
          <>
            <p className={s.legalIntro}>
              {projects.length} {projects.length === 1 ? "game" : "games"} · {formatPlays(totalViews)} views · {formatPlays(totalPlays)} plays
            </p>
            <ManageStats projects={projects} days={days} handle={profile.handle} />
          </>
        )}
      </>
    );
  }

  return (
    <div className={`${s.create} ${s.pageSkin}`}>
      <div className={s.frame}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>Creator</p>
          <h1 className={s.createTitle}>Manage games</h1>
          {body}
        </div>
      </div>
    </div>
  );
}
