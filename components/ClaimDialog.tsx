"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Illustration } from "@/components/ds/illustration";
import { IconClose } from "@/components/icons";
import { useLoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { CLAIM_EVIDENCE_MAX, CLAIM_EVIDENCE_MIN, claimErrorMessage } from "@/lib/claims";
import { createClient } from "@/lib/supabase/client";

/**
 * Claim a curated game (#30, PR 0). Sends a claim request through submit_claim; an admin checks it
 * in /admin?tab=claims and moves the game to the claimant's account.
 */
export function ClaimDialog({
  projectId,
  gameTitle,
  intro,
  onClose,
  onSent,
}: {
  projectId: string;
  gameTitle: string;
  intro: string;
  onClose: () => void;
  /** Called once the claim is saved, so the page can show that it is waiting. */
  onSent: () => void;
}) {
  const titleId = useId();
  const { user, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const [evidence, setEvidence] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tooShort = evidence.trim().length < CLAIM_EVIDENCE_MIN;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || pending) return;
    if (!user) {
      openLogin();
      return;
    }
    if (tooShort) {
      setError(claimErrorMessage("confirm the game is yours"));
      return;
    }
    setPending(true);
    setError("");
    const { error: saveError } = await createClient().rpc("submit_claim", { pid: projectId, p_evidence: evidence.trim() });
    setPending(false);
    if (saveError) {
      setError(claimErrorMessage(saveError.message));
      return;
    }
    setSent(true);
    onSent();
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-bg/70 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-border bg-surface-2 p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-title font-semibold tracking-tight text-text">
            {sent ? "Claim sent" : `Claim ${gameTitle}`}
          </h2>
          <button
            type="button"
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-text-subtle hover:bg-surface-3 hover:text-text"
            onClick={onClose}
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
        {sent ? (
          <>
            <Illustration name="success" size="s" />
            <p className="mt-3 text-body text-text-muted">
              Thanks. We will check it and reply to {user?.email ? <strong className="text-text">{user.email}</strong> : "your account email"}.
            </p>
            <Button type="button" variant="primary" className="mt-6 w-full" onClick={onClose}>
              OK
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-body text-text-muted">{intro}</p>
            <form onSubmit={(e) => void onSubmit(e)} className="mt-5 flex flex-col gap-4">
              <Field label="How can we confirm it is yours?">
                <TextArea
                  name="evidence"
                  required
                  minLength={CLAIM_EVIDENCE_MIN}
                  maxLength={CLAIM_EVIDENCE_MAX}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="For example a link to your profile or repo, or an email from the address on your game page."
                />
              </Field>
              <p className="-mt-2 text-caption text-text-subtle">
                {user?.email ? `We will reply to ${user.email}.` : "Sign in first. We will reply to your account email."}
              </p>
              <Button type="submit" variant="primary" className="self-start" disabled={loading || pending}>
                {pending ? "Sending…" : user ? "Send claim" : "Sign in to claim"}
              </Button>
              {error ? (
                <p role="alert" className="text-ui text-danger">
                  {error}
                </p>
              ) : null}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
