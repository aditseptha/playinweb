"use client";

import { useCallback, useEffect, useState } from "react";
import { formatWhen } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { CLAIM_STATUS_LABEL, decideErrorMessage, isClaimStatus, type ClaimStatus } from "@/lib/claims";
import { apexHref, projectPublicUrl } from "@/lib/host";
import { createClient } from "@/lib/supabase/client";

type ClaimRow = {
  id: string;
  status: string;
  email: string;
  evidence: string;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  claimant: { handle: string; display_name: string } | null;
  project: { title: string; slug: string; owner: { handle: string } | null } | null;
};

const CLAIM_SELECT =
  "id, status, email, evidence, decision_note, created_at, decided_at, " +
  "claimant:profiles!project_claims_claimant_id_fkey ( handle, display_name ), " +
  "project:projects ( title, slug, owner:profiles!projects_owner_id_fkey ( handle ) )";

/**
 * Admin tab for claim requests (#30, PR 0). Approving moves the curated game to the claimant's
 * account (plays, likes and the old address come along); rejecting puts it back to listed.
 */
export function ClaimsTable() {
  const [claims, setClaims] = useState<ClaimRow[] | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void createClient()
      .from("project_claims")
      .select(CLAIM_SELECT)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: listError }) => {
        if (cancelled) return;
        if (listError) {
          setError("Could not load claims. Has the claims migration (20261124120000_project_claims.sql) run?");
          setClaims([]);
          return;
        }
        setError("");
        setClaims((data ?? []) as unknown as ClaimRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);
  const waiting = claims?.filter((c) => c.status === "pending") ?? [];
  const decided = claims?.filter((c) => c.status !== "pending") ?? [];

  return (
    <section className="mt-8">
      <h2 className="text-title font-semibold tracking-tight">Claims</h2>
      <p className="mt-1 max-w-2xl text-ui text-text-muted">
        Creators asking for their curated game. Check the evidence (a profile, repo or email that matches the game&rsquo;s
        credit), then approve to move the game to their account, or reject with a reason. Reply to them by email either way.
      </p>
      {error ? <p className="mt-4 text-ui text-danger">{error}</p> : null}

      <h3 className="mt-6 text-ui font-semibold">Waiting{claims ? ` (${waiting.length})` : ""}</h3>
      <div className="mt-3 flex flex-col gap-3">
        {claims === null ? (
          <p className="rounded-panel bg-surface-2 px-4 py-6 text-ui text-text-muted">Loading claims…</p>
        ) : waiting.length === 0 ? (
          <p className="rounded-panel bg-surface-2 px-4 py-6 text-ui text-text-muted">No claims waiting.</p>
        ) : (
          waiting.map((claim) => <ClaimCard key={claim.id} claim={claim} onDecided={refresh} />)
        )}
      </div>

      {decided.length > 0 ? (
        <>
          <h3 className="mt-8 text-ui font-semibold">Decided</h3>
          <div className="mt-3 overflow-x-auto rounded-panel bg-surface-2">
            <table className="w-full min-w-[48rem] text-left text-ui">
              <thead className="text-caption text-text-subtle">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium">Game</th>
                  <th className="px-4 py-3 font-medium">Claimant</th>
                  <th className="px-4 py-3 font-medium">Decision</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium">Decided</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((claim) => (
                  <tr key={claim.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-medium">{claim.project?.title ?? "Deleted game"}</td>
                    <td className="px-4 py-3 text-text-muted">@{claim.claimant?.handle ?? "deleted"}</td>
                    <td className="px-4 py-3">{statusLabel(claim.status)}</td>
                    <td className="max-w-xs px-4 py-3 whitespace-pre-wrap text-text-muted">{claim.decision_note || "—"}</td>
                    <td className="px-4 py-3 text-text-muted">{formatWhen(claim.decided_at)}</td>
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

function statusLabel(status: string) {
  return isClaimStatus(status) ? CLAIM_STATUS_LABEL[status as ClaimStatus] : status;
}

function ClaimCard({ claim, onDecided }: { claim: ClaimRow; onDecided: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const game = claim.project;
  const gameUrl = game?.owner ? projectPublicUrl(game.owner.handle, game.slug) : null;
  const claimant = claim.claimant;

  async function decide(approve: boolean) {
    if (busy) return;
    const question = approve
      ? `Move "${game?.title ?? "this game"}" to @${claimant?.handle ?? "the claimant"}? Its plays, likes and address move with it.`
      : `Reject this claim for "${game?.title ?? "this game"}"?`;
    if (!window.confirm(question)) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    const { data, error } = await createClient().rpc("admin_decide_claim", {
      p_claim: claim.id,
      p_approve: approve,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (error) {
      setFailed(true);
      setMessage(decideErrorMessage(error.message));
      return;
    }
    const moved = Array.isArray(data) ? data[0] : null;
    setMessage(moved ? `Moved. The game now lives at ${projectPublicUrl(moved.owner_handle, moved.slug)}` : "Rejected.");
    window.setTimeout(onDecided, 1500);
  }

  return (
    <article className="rounded-panel bg-surface-2 px-5 py-4">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="min-w-0 text-body font-semibold">
          {gameUrl ? (
            <a href={gameUrl} className="hover:underline">
              {game?.title}
            </a>
          ) : (
            (game?.title ?? "Deleted game")
          )}
        </p>
        <p className="text-caption text-text-subtle">Sent {formatWhen(claim.created_at)}</p>
      </div>
      <p className="mt-1 text-ui text-text-muted">
        By{" "}
        {claimant ? (
          <a href={apexHref(`/channel/${claimant.handle}`)} className="font-medium text-text hover:underline">
            {claimant.display_name || claimant.handle} (@{claimant.handle})
          </a>
        ) : (
          "a deleted account"
        )}
        {claim.email ? (
          <>
            {" · "}
            <a href={`mailto:${claim.email}`} className="text-brand-blue hover:underline">
              {claim.email}
            </a>
          </>
        ) : null}
      </p>
      <p className="mt-3 rounded-lg bg-surface-3 px-3 py-2.5 text-ui whitespace-pre-wrap">{claim.evidence}</p>
      <label className="mt-3 block text-caption text-text-subtle" htmlFor={`note-${claim.id}`}>
        Note (optional, kept with the decision)
      </label>
      <TextArea
        id={`note-${claim.id}`}
        className="mt-1 min-h-[3.5rem]"
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="For example: matched the itch.io account"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" disabled={busy} onClick={() => void decide(true)}>
          Approve and move game
        </Button>
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void decide(false)}>
          Reject
        </Button>
        {message ? (
          <p role="status" className={failed ? "text-ui text-danger" : "text-ui text-text-muted"}>
            {message}
          </p>
        ) : null}
      </div>
    </article>
  );
}
