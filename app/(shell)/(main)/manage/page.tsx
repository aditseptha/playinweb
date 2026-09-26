"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ManageStats } from "@/components/ManageStats";
import { useLoginDialog } from "@/components/LoginDialog";
import { useSignupDialog } from "@/components/SignupDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatPlays } from "@/lib/format";
import { apexHref } from "@/lib/host";
import { fetchOwnerStatDays, fetchProjectsForOwner, type ProjectRecord, type StatDay } from "@/lib/projects";

function sinceDay(days: number) {
  const n = new Date();
  n.setUTCDate(n.getUTCDate() - days);
  return n.toISOString().slice(0, 10);
}

export default function ManageGamesPage() {
  const { user, profile, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null);
  const [days, setDays] = useState<StatDay[]>([]);

  useEffect(() => {
    if (!user) {
      setProjects(user === null && !loading ? [] : null);
      setDays([]);
      return;
    }
    const uid = user.id;
    let cancelled = false;
    async function load() {
      const [rows, stats] = await Promise.all([fetchProjectsForOwner(uid), fetchOwnerStatDays(sinceDay(56))]);
      if (!cancelled) {
        setProjects(rows);
        setDays(stats);
      }
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
  }, [loading, user]);

  if (loading) return <p className="text-ui text-text-muted">Loading account…</p>;

  if (!user || !profile) {
    return (
      <div className="min-w-0 pt-4">
        <h1 className="text-display font-semibold tracking-tight">Manage games</h1>
        <p className="mt-1.5 text-body text-text-muted">Sign in to see views and edit your listings.</p>
        <div className="mt-6 flex gap-3">
          <Button type="button" variant="primary" size="sm" onClick={() => openLogin()}>
            Sign in
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => openSignup()}>
            Create account
          </Button>
        </div>
      </div>
    );
  }

  const totalViews = (projects ?? []).reduce((n, p) => n + (p.view_count ?? 0), 0);
  const totalPlays = (projects ?? []).reduce((n, p) => n + Math.min(p.play_count, p.view_count ?? 0), 0);

  return (
    <div className="min-w-0 pt-4">
      <h1 className="text-display font-semibold tracking-tight">Manage games</h1>
      <p className="mt-1.5 text-body text-text-muted">
        {projects === null
          ? "Loading your listings…"
          : `${projects.length} ${projects.length === 1 ? "game" : "games"} · ${formatPlays(totalViews)} views · ${formatPlays(totalPlays)} plays`}
      </p>

      {projects === null ? null : projects.length === 0 ? (
        <div className="mt-10 rounded-panel bg-surface-2 px-5 py-12 text-center">
          <p className="font-medium">No games yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Publish a listing and it will show up here with view counts.
          </p>
          <Link
            href={apexHref("/register")}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-surface-2 px-3.5 text-body font-medium hover:bg-surface-3"
          >
            Create a game
          </Link>
        </div>
      ) : (
        <ManageStats projects={projects} days={days} handle={profile.handle} />
      )}
    </div>
  );
}
