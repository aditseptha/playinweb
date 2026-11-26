"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatWhen } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import {
  BEST_OF_SLUG,
  CITATION_MAX,
  CITATION_MIN,
  REVOKE_REASON_MAX,
  REVOKE_REASON_MIN,
  grantErrorMessage,
  revokeErrorMessage,
} from "@/lib/awards";
import { isCuratedHandle } from "@/lib/curation";
import { projectPublicUrl } from "@/lib/host";
import { createClient } from "@/lib/supabase/client";

type AwardType = { slug: string; name: string };

type Grant = {
  id: string;
  award_slug: string;
  citation: string;
  awarded_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
  project: { id: string; title: string; slug: string; owner: { handle: string } | null } | null;
  giver: { handle: string } | null;
};

type FoundGame = { id: string; title: string; slug: string; owner: { handle: string } | null };

const GRANT_SELECT =
  "id, award_slug, citation, awarded_at, revoked_at, revoke_reason, " +
  "project:projects ( id, title, slug, owner:profiles!projects_owner_id_fkey ( handle ) ), " +
  "giver:profiles!award_grants_awarded_by_fkey ( handle )";

const gameUrl = (g: { slug: string; owner: { handle: string } | null } | null) =>
  g?.owner ? projectPublicUrl(g.owner.handle, g.slug) : null;

/**
 * Admin tab for awards (#30, PR 1). Give Best of PlayInWeb to a published game with a short "why",
 * or take an award back with a reason. Awards show on the game page in a later PR.
 */
export function AwardsPanel() {
  const [types, setTypes] = useState<AwardType[] | null>(null);
  const [grants, setGrants] = useState<Grant[] | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void Promise.all([
      supabase.from("award_types").select("slug, name").eq("active", true).order("created_at"),
      supabase.from("award_grants").select(GRANT_SELECT).order("awarded_at", { ascending: false }).limit(500),
    ]).then(([typesRes, grantsRes]) => {
      if (cancelled) return;
      if (typesRes.error || grantsRes.error) {
        setError("Could not load awards. Has the awards migration (20261124130000_awards.sql) run?");
        setTypes([]);
        setGrants([]);
        return;
      }
      setError("");
      setTypes(typesRes.data ?? []);
      setGrants((grantsRes.data ?? []) as unknown as Grant[]);
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);
  const standing = grants?.filter((g) => !g.revoked_at) ?? [];
  const revoked = grants?.filter((g) => g.revoked_at) ?? [];
  const typeName = (slug: string) => types?.find((t) => t.slug === slug)?.name ?? slug;

  return (
    <section className="mt-8">
      <h2 className="text-title font-semibold tracking-tight">Awards</h2>
      <p className="mt-1 max-w-2xl text-ui text-text-muted">
        Best of PlayInWeb is our mark for the games we love most. Any published game can get it once, curated games
        included. Keep it rare: the first few set the bar.
      </p>
      {error ? <p className="mt-4 text-ui text-danger">{error}</p> : null}

      {types && types.length > 0 ? (
        <GiveAward types={types} standing={standing} onGiven={refresh} />
      ) : null}

      <h3 className="mt-8 text-ui font-semibold">
        Awarded{grants ? ` (${standing.length})` : ""}
      </h3>
      <div className="mt-3 overflow-x-auto rounded-panel bg-surface-2">
        <table className="w-full min-w-[52rem] text-left text-ui">
          <thead className="text-caption text-text-subtle">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Game</th>
              <th className="px-4 py-3 font-medium">Award</th>
              <th className="px-4 py-3 font-medium">Why</th>
              <th className="px-4 py-3 font-medium">Given</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {grants === null ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-text-muted">
                  Loading awards…
                </td>
              </tr>
            ) : standing.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-text-muted">
                  No awards yet.
                </td>
              </tr>
            ) : (
              standing.map((g) => <GrantRow key={g.id} grant={g} awardName={typeName(g.award_slug)} onRevoked={refresh} />)
            )}
          </tbody>
        </table>
      </div>

      {revoked.length > 0 ? (
        <>
          <h3 className="mt-8 text-ui font-semibold">Taken back</h3>
          <div className="mt-3 overflow-x-auto rounded-panel bg-surface-2">
            <table className="w-full min-w-[44rem] text-left text-ui">
              <thead className="text-caption text-text-subtle">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium">Game</th>
                  <th className="px-4 py-3 font-medium">Award</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Taken back</th>
                </tr>
              </thead>
              <tbody>
                {revoked.map((g) => (
                  <tr key={g.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{g.project?.title ?? "Deleted game"}</td>
                    <td className="px-4 py-3 text-text-muted">{typeName(g.award_slug)}</td>
                    <td className="max-w-sm px-4 py-3 whitespace-pre-wrap text-text-muted">{g.revoke_reason}</td>
                    <td className="px-4 py-3 text-text-muted">{formatWhen(g.revoked_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function GiveAward({ types, standing, onGiven }: { types: AwardType[]; standing: Grant[]; onGiven: () => void }) {
  const [award, setAward] = useState(types.find((t) => t.slug === BEST_OF_SLUG)?.slug ?? types[0].slug);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundGame[] | null>(null);
  const [game, setGame] = useState<FoundGame | null>(null);
  const [citation, setCitation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  // Games that already hold the chosen award.
  const holders = useMemo(
    () => new Set(standing.filter((g) => g.award_slug === award).map((g) => g.project?.id).filter(Boolean) as string[]),
    [standing, award],
  );

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const id = window.setTimeout(() => {
      void createClient()
        .from("projects")
        .select("id, title, slug, owner:profiles!projects_owner_id_fkey ( handle )")
        .eq("published", true)
        .ilike("title", `%${q}%`)
        .order("play_count", { ascending: false })
        .limit(8)
        .then(({ data }) => {
          if (!cancelled) setResults((data ?? []) as unknown as FoundGame[]);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query]);

  // Results only show for a search of two letters or more.
  const shown = query.trim().length >= 2 ? results : null;
  const length = citation.trim().length;
  const canGive = Boolean(game) && length >= CITATION_MIN && length <= CITATION_MAX && !busy && !holders.has(game?.id ?? "");
  const awardName = types.find((t) => t.slug === award)?.name ?? award;

  async function give() {
    if (!game || !canGive) return;
    if (!window.confirm(`Give ${awardName} to "${game.title}"? It shows on the game's page.`)) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    const { error } = await createClient().rpc("admin_grant_award", { p_project: game.id, p_award: award, p_citation: citation.trim() });
    setBusy(false);
    if (error) {
      setFailed(true);
      setMessage(grantErrorMessage(error.message));
      return;
    }
    setMessage(`${game.title} is now ${awardName}.`);
    setGame(null);
    setQuery("");
    setResults(null);
    setCitation("");
    onGiven();
  }

  return (
    <div className="mt-6 rounded-panel bg-surface-2 px-5 py-5">
      <h3 className="text-ui font-semibold">Give an award</h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {types.length > 1 ? (
            <Field label="Award">
              <select
                value={award}
                onChange={(e) => setAward(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface-3 px-3 text-body"
              >
                {types.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="text-ui text-text-muted">
              Award: <strong className="text-text">{awardName}</strong>
            </p>
          )}
          <Field label="Game">
            <TextInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setGame(null);
              }}
              placeholder="Search published games by title"
              aria-describedby="award-game-help"
            />
          </Field>
          <p id="award-game-help" className="-mt-2 text-caption text-text-subtle">
            Type at least two letters.
          </p>
          {shown ? (
            shown.length === 0 ? (
              <p className="text-ui text-text-muted">No published game matches.</p>
            ) : (
              <ul className="flex flex-col gap-1" aria-label="Matching games">
                {shown.map((r) => {
                  const holds = holders.has(r.id);
                  const picked = game?.id === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        disabled={holds}
                        aria-pressed={picked}
                        onClick={() => setGame(r)}
                        className={
                          "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-ui transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
                          (picked ? "bg-surface-3 ring-1 ring-border-strong" : "hover:bg-surface-3")
                        }
                      >
                        <span className="min-w-0 truncate font-medium">{r.title}</span>
                        <span className="shrink-0 text-caption text-text-subtle">
                          {holds ? `Already ${awardName}` : isCuratedHandle(r.owner?.handle) ? "Curated" : `@${r.owner?.handle ?? "?"}`}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <Field label="Why this game">
            <TextArea
              value={citation}
              onChange={(e) => setCitation(e.target.value)}
              maxLength={CITATION_MAX}
              placeholder="One or two sentences. Players see this with the medal on the game's page."
            />
          </Field>
          <p className="-mt-2 text-caption text-text-subtle">
            {length}/{CITATION_MAX} · at least {CITATION_MIN}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" disabled={!canGive} onClick={() => void give()}>
              {game ? `Give to ${game.title}` : "Pick a game first"}
            </Button>
            {message ? (
              <p role="status" className={failed ? "text-ui text-danger" : "text-ui text-text-muted"}>
                {message}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function GrantRow({ grant, awardName, onRevoked }: { grant: Grant; awardName: string; onRevoked: () => void }) {
  const [revoking, setRevoking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = gameUrl(grant.project);
  const curated = isCuratedHandle(grant.project?.owner?.handle);

  async function revoke() {
    if (busy) return;
    const why = reason.trim();
    if (why.length < REVOKE_REASON_MIN) {
      setError(revokeErrorMessage("say why"));
      return;
    }
    setBusy(true);
    setError("");
    const { error: rpcError } = await createClient().rpc("admin_revoke_award", { p_grant: grant.id, p_reason: why });
    setBusy(false);
    if (rpcError) {
      setError(revokeErrorMessage(rpcError.message));
      return;
    }
    onRevoked();
  }

  return (
    <tr className="border-b border-border/70 align-top last:border-0">
      <td className="max-w-[14rem] px-4 py-3">
        {url ? (
          <a href={url} className="font-medium hover:underline">
            {grant.project?.title}
          </a>
        ) : (
          <span className="font-medium">{grant.project?.title ?? "Deleted game"}</span>
        )}
        {curated ? <span className="block text-caption text-text-subtle">Curated, not claimed yet</span> : null}
      </td>
      <td className="px-4 py-3 text-text-muted">{awardName}</td>
      <td className="max-w-sm px-4 py-3 whitespace-pre-wrap text-text-muted">{grant.citation}</td>
      <td className="px-4 py-3 text-text-muted">
        {formatWhen(grant.awarded_at)}
        {grant.giver ? <span className="block text-caption text-text-subtle">by @{grant.giver.handle}</span> : null}
      </td>
      <td className="w-[18rem] px-4 py-3 text-right">
        {revoking ? (
          <div className="flex flex-col items-stretch gap-2 text-left">
            <TextInput
              value={reason}
              maxLength={REVOKE_REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why it is taken back"
              aria-label={`Reason for taking back ${awardName} from ${grant.project?.title ?? "this game"}`}
            />
            <div className="flex gap-2">
              <Button variant="primary" size="sm" disabled={busy} onClick={() => void revoke()}>
                Take back
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setRevoking(false)}>
                Cancel
              </Button>
            </div>
            {error ? (
              <p role="alert" className="text-caption text-danger">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setRevoking(true)}>
            Take back
          </Button>
        )}
      </td>
    </tr>
  );
}
