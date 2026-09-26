"use client";

import { useEffect, useState, type FormEvent } from "react";
import { IconCheck } from "@/components/icons";
import { useLoginDialog } from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export default function ReportPage() {
  const { user, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!sent) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSent(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sent]);

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
    form.reset();
    setSent(true);
  }

  return (
    <div className="flex min-h-[calc(100dvh-9.75rem)] min-w-0 items-center justify-center">
      <div className="w-full rounded-2xl border border-border bg-surface-2 p-6 sm:w-1/2 sm:p-8">
        <h1 className="text-display font-semibold tracking-tight">Report an issue</h1>
        <p className="mt-1.5 text-body text-text-muted">
          Broken play links, missing files, or something that should not be here.
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 flex flex-col gap-4">
          <Field label="Subject">
            <TextInput name="subject" required placeholder="What went wrong?" />
          </Field>
          <Field label="Details">
            <TextArea name="details" required placeholder="Page, game, and what you expected." />
          </Field>
          <Button type="submit" variant="primary" className="self-start" disabled={loading || pending}>
            {pending ? "Sending…" : "Submit report"}
          </Button>
          {error ? <p className="text-ui text-danger">{error}</p> : null}
        </form>
      </div>
      {sent ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4" onClick={() => setSent(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-sent-title"
            className="w-full max-w-sm rounded-panel bg-surface p-6 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid size-11 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
              <IconCheck className="h-5 w-5" />
            </div>
            <h2 id="report-sent-title" className="mt-4 text-title font-semibold tracking-tight">
              Report sent
            </h2>
            <p className="mt-1.5 text-body text-text-muted">Thanks. We got your report.</p>
            <Button type="button" variant="primary" className="mt-6 w-full" onClick={() => setSent(false)}>
              OK
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
