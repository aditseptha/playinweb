"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  AuthFooterLink,
  AuthInput,
  AuthOrDivider,
  AuthPasswordInput,
  AuthPrimaryButton,
  GoogleAuthButton,
} from "@/components/AuthModal";
import { continueAfterAuth } from "@/lib/auth-redirect";
import { passwordResetCallbackUrl } from "@/lib/oauth";
import { createClient } from "@/lib/supabase/client";

type LoginFormMode = "sign-in" | "forgot";

export function LoginForm({
  next: nextProp,
  onSuccess,
  onModeChange,
}: {
  next?: string | null;
  onSuccess?: () => void;
  onModeChange?: (mode: LoginFormMode) => void;
} = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const next = nextProp ?? params.get("next");
  const [mode, setMode] = useState<LoginFormMode>("sign-in");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  function switchMode(nextMode: LoginFormMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    onModeChange?.(nextMode);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    const fd = new FormData(e.currentTarget);
    const nextEmail = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    setEmail(nextEmail);
    setPending(true);
    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signInWithPassword({ email: nextEmail, password });
    if (signError) {
      setPending(false);
      setError(signError.message);
      return;
    }
    onSuccess?.();
    continueAfterAuth(data.session, next);
    router.refresh();
  }

  async function onForgotSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    const fd = new FormData(e.currentTarget);
    const nextEmail = String(fd.get("email") ?? "").trim();
    if (!nextEmail) {
      setError("Enter the email for your account.");
      return;
    }
    setEmail(nextEmail);
    setPending(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(nextEmail, {
      redirectTo: passwordResetCallbackUrl(),
    });
    setPending(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setNotice("Check your email for a reset link.");
  }

  if (mode === "forgot") {
    return (
      <form onSubmit={onForgotSubmit} className="flex flex-col gap-4">
        <AuthInput
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error ? <p className="text-ui text-danger">{error}</p> : null}
        {notice ? <p className="text-ui text-text-muted">{notice}</p> : null}
        <AuthPrimaryButton pending={pending} pendingLabel="Sending…">Send reset link</AuthPrimaryButton>
        <AuthFooterLink lead="Remembered it?" action="Back to sign in" onClick={() => switchMode("sign-in")} />
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <GoogleAuthButton next={next} disabled={pending} onError={setError} />
      <AuthOrDivider />
      <AuthInput
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <div className="space-y-2">
        <AuthPasswordInput />
        <div className="flex justify-end">
          <button
            type="button"
            className="text-meta text-text-subtle transition-colors hover:text-text hover:underline"
            onClick={() => switchMode("forgot")}
          >
            Forgot password?
          </button>
        </div>
      </div>
      {error ? <p className="text-ui text-danger">{error}</p> : null}
      <AuthPrimaryButton pending={pending} pendingLabel="Signing in…">Sign in</AuthPrimaryButton>
    </form>
  );
}

export function LoginFormFooter({
  onCreateAccount,
}: {
  onCreateAccount: () => void;
}) {
  return <AuthFooterLink lead="No account yet?" action="Create one" onClick={onCreateAccount} />;
}
