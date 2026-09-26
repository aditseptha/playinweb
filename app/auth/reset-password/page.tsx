"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-ui text-text-muted">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (code) {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("code", code);
      callback.searchParams.set("next", "/auth/reset-password");
      window.location.replace(callback.toString());
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    async function prepare() {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (hashParams.get("type") === "recovery" && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (cancelled) return;
          if (sessionError) {
            setError(sessionError.message);
            return;
          }
          window.history.replaceState(null, "", window.location.pathname);
          setReady(true);
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (data.session) setReady(true);
      else setError("This reset link is invalid or has expired. Request a new one from the sign-in page.");
    }

    void prepare();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [code]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (error && !ready) {
    return (
      <div className="min-w-0 pt-4">
        <h1 className="text-display font-semibold tracking-tight">Reset password</h1>
        <p className="mt-3 text-body text-danger">{error}</p>
        <Button type="button" variant="secondary" size="sm" className="mt-6" onClick={() => router.push("/")}>
          Back home
        </Button>
      </div>
    );
  }

  if (!ready) {
    return <p className="pt-4 text-ui text-text-muted">Preparing password reset…</p>;
  }

  return (
    <div className="min-w-0 pt-4">
      <h1 className="text-display font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1.5 text-body text-text-muted">Enter a new password for your account.</p>
      <form onSubmit={onSubmit} className="mt-8 flex max-w-md flex-col gap-5 rounded-panel bg-surface-2 p-5">
        <Field label="New password">
          <TextInput name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password">
          <TextInput name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        {error ? <p className="text-ui text-danger">{error}</p> : null}
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
