"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProjectForm } from "@/components/ProjectForm";
import { LinkButton } from "@/components/ui/button";
import { formatWhen } from "@/components/admin/shared";
import { attributionText, curationFromRow, CURATED_HANDLE, licenseLabel } from "@/lib/curation";
import { formatPlays } from "@/lib/format";
import { projectPublicUrl } from "@/lib/host";
import { PROJECT_SELECT, withCuration, type ProjectRecord } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";

const DONE_HREF = "/admin?tab=curated";

type Owner = { id: string; handle: string };

/** Admin tab for curated games (#9): games by other creators, hosted with credit until they claim them. */
export function CuratedGames() {
  const searchParams = useSearchParams();
  const adding = searchParams.get("new") === "1";
  const editId = searchParams.get("edit");
  // undefined: loading. null: the `listed` account does not exist (migration not run).
  const [owner, setOwner] = useState<Owner | null | undefined>(undefined);
  const [games, setGames] = useState<ProjectRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const { data: profile } = await supabase.from("profiles").select("id, handle").eq("handle", CURATED_HANDLE).maybeSingle();
      if (cancelled) return;
      if (!profile) {
        setOwner(null);
        return;
      }
      setOwner(profile);
      const { data, error: listError } = await supabase
        .from("projects")
        .select(PROJECT_SELECT)
        .eq("owner_id", profile.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (listError) {
        setError(listError.message);
        setGames([]);
        return;
      }
      setGames(await withCuration(supabase, (data ?? []) as unknown as ProjectRecord[]));
    })();
    return () => {
      cancelled = true;
    };
  }, [adding, editId]);

  if (owner === undefined) return <p className="mt-8 text-ui text-text-muted">Loading curated games…</p>;

  if (owner === null) {
    return (
      <div className="mt-8 rounded-panel bg-surface-2 px-5 py-6">
        <p className="text-ui font-medium">Curated games are not set up yet</p>
        <p className="mt-1 text-ui text-text-muted">
          The <code>listed</code> account is missing. Run the curated games migration in Supabase first
          (<code>20261110130000_curated_games.sql</code>).
        </p>
      </div>
    );
  }

  const target = { ownerId: owner.id, handle: owner.handle, doneHref: DONE_HREF };

  if (adding) {
    return (
      <section className="mt-8">
        <Header title="Add a curated game" back />
        <ProjectForm curated={target} />
      </section>
    );
  }

  if (editId) {
    const game = games?.find((g) => g.id === editId);
    if (!games) return <p className="mt-8 text-ui text-text-muted">Loading game…</p>;
    if (!game) {
      return (
        <section className="mt-8">
          <Header title="Game not found" back />
          <p className="text-ui text-text-muted">It may have been deleted, or it is not a curated game.</p>
        </section>
      );
    }
    return (
      <section className="mt-8">
        <Header title={`Edit ${game.title}`} back />
        <ProjectForm key={game.id} project={game} curated={{ ...target, row: game.project_curation }} />
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-title font-semibold tracking-tight">Curated games</h2>
          <p className="mt-1 max-w-2xl text-ui text-text-muted">
            Games by other creators, hosted under an open license or with permission. They stay out of Top Played and
            the featured hero, and comments and donations stay off until the creator claims them.
          </p>
        </div>
        <LinkButton href={`${DONE_HREF}&new=1`} variant="primary" size="sm" className="shrink-0">
          Add curated game
        </LinkButton>
      </div>
      {error ? <p className="mt-4 text-ui text-danger">{error}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-panel bg-surface-2">
        <table className="w-full min-w-[56rem] text-left text-ui">
          <thead className="text-caption text-text-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">License</th>
              <th className="px-4 py-3 font-medium">Visibility</th>
              <th className="px-4 py-3 font-medium">Plays</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {games === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-text-muted">
                  Loading curated games…
                </td>
              </tr>
            ) : games.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-text-muted">
                  No curated games yet. Add the first one.
                </td>
              </tr>
            ) : (
              games.map((game) => {
                const credit = curationFromRow(game.project_curation);
                return (
                  <tr key={game.id} className="border-b border-border last:border-0">
                    <td className="max-w-[16rem] px-4 py-3">
                      <a href={projectPublicUrl(owner.handle, game.slug)} className="font-medium hover:underline">
                        {game.title}
                      </a>
                      <span className="block truncate text-caption text-text-subtle">/{owner.handle}/{game.slug}</span>
                    </td>
                    <td className="max-w-[14rem] px-4 py-3">
                      {credit ? (
                        <span title={attributionText(credit)}>{credit.creatorName}</span>
                      ) : (
                        <span className="text-danger">Missing credit</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {credit ? licenseLabel(credit.license) : "—"}
                      {credit?.modified ? <span className="block text-caption text-text-subtle">Modified</span> : null}
                    </td>
                    <td className="px-4 py-3">{game.published ? "Public" : "Draft"}</td>
                    <td className="px-4 py-3 tabular-nums">{formatPlays(game.play_count)}</td>
                    <td className="px-4 py-3 text-text-muted">{formatWhen(game.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`${DONE_HREF}&edit=${game.id}`} className="font-medium text-brand-blue hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Header({ title, back }: { title: string; back?: boolean }) {
  return (
    <div className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-3">
      <h2 className="text-title font-semibold tracking-tight">{title}</h2>
      {back ? (
        <Link href={DONE_HREF} className="text-ui font-medium text-brand-blue hover:underline">
          ← All curated games
        </Link>
      ) : null}
    </div>
  );
}
