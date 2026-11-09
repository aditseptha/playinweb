"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { IconCheck, IconClose } from "@/components/icons";
import { useLoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

/** `defaultSubject` pre-fills the subject, for example "Game: Ayam Kabur (link)" from a game page. */
export function ReportDialog({ onClose, defaultSubject }: { onClose: () => void; defaultSubject?: string }) {
  const titleId = useId();
  const { user, loading } = useAuth();
  const { openLogin } = useLoginDialog();
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || pending) return;
    if (!user?.email) {
      openLogin();
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    const subject = String(fd.get("subject") ?? "").trim();
    const details = String(fd.get("details") ?? "").trim();
    if (!subject || !details) return;
    setPending(true);
    setError("");
    const { error: saveError } = await createClient().from("issue_reports").insert({
      user_id: user.id,
      email: user.email,
      subject,
      details,
    });
    setPending(false);
    if (saveError) {
      setError("Could not send the report. Try again.");
      return;
    }
    setSent(true);
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
            {sent ? "Report sent" : "Report an issue"}
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
            <div className="mt-4 grid size-11 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
              <IconCheck className="h-5 w-5" />
            </div>
            <p className="mt-3 text-body text-text-muted">Thanks. We got your report.</p>
            <Button type="button" variant="primary" className="mt-6 w-full" onClick={onClose}>
              OK
            </Button>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-body text-text-muted">
              Broken play links, missing files, or something that should not be here.
            </p>
            <form onSubmit={(e) => void onSubmit(e)} className="mt-5 flex flex-col gap-4">
              <Field label="Subject">
                <TextInput name="subject" required placeholder="What went wrong?" defaultValue={defaultSubject} />
              </Field>
              <Field label="Details">
                <TextArea name="details" required placeholder="Page, game, and what you expected." />
              </Field>
              <Button type="submit" variant="primary" className="self-start" disabled={loading || pending}>
                {pending ? "Sending…" : "Submit report"}
              </Button>
              {error ? <p className="text-ui text-danger">{error}</p> : null}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
