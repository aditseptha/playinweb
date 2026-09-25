"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  AuthFooterLink,
  AuthInput,
  AuthOrDivider,
  AuthPasswordInput,
  AuthPrimaryButton,
  GoogleAuthButton,
} from "@/components/AuthModal";
import { SignupAgreeNote } from "@/components/SignupAgreeNote";
import { slugify } from "@/lib/format";
import { getRootDomain, isHandle, siteOrigin } from "@/lib/host";
import { createClient } from "@/lib/supabase/client";

export function SignupForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const displayName = String(fd.get("displayName") ?? "").trim();
    const nextHandle = handle.trim().toLowerCase();

    if (!email || !password || !displayName || !nextHandle) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!isHandle(nextHandle)) {
      setError("Handle must be 3–32 characters: lowercase letters, numbers, and hyphens.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data: taken } = await supabase.from("profiles").select("id").eq("handle", nextHandle).maybeSingle();
    if (taken) {
      setPending(false);
      setError("That handle is already taken.");
      return;
    }

    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { handle: nextHandle, display_name: displayName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (signError) {
      setPending(false);
      setError(signError.message);
      return;
    }
    if (!data.session) {
      setPending(false);
      setNotice("Check your email to confirm the account, then sign in.");
      return;
    }
    onSuccess?.();
    router.push("/register");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <GoogleAuthButton disabled={pending} onError={setError} />
      <AuthOrDivider />
      <AuthInput
        name="displayName"
        required
        autoComplete="name"
        placeholder="Display name"
        onChange={(e) => {
          if (!handle) setHandle(slugify(e.target.value).slice(0, 32));
        }}
      />
      <div className="flex h-11 items-center overflow-hidden rounded-xl border border-border bg-surface-3">
        <span className="hidden shrink-0 px-3 text-caption text-text-subtle sm:inline">{getRootDomain()}/</span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="yourname"
          aria-label="Account URL"
          className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-body outline-none placeholder:text-text-subtle"
        />
      </div>
      <p className="-mt-2 text-meta text-text-subtle">
        Your page will live at {handle ? siteOrigin(handle) : siteOrigin("yourname")}
      </p>
      <AuthInput name="email" type="email" required autoComplete="email" placeholder="Email" />
      <AuthPasswordInput autoComplete="new-password" placeholder="Password" minLength={8} />
      {error ? <p className="text-ui text-danger">{error}</p> : null}
      {notice ? <p className="text-ui text-text-muted">{notice}</p> : null}
      <SignupAgreeNote popup />
      <AuthPrimaryButton pending={pending} pendingLabel="Creating…">Create account</AuthPrimaryButton>
    </form>
  );
}

export function SignupFormFooter({ onSignIn }: { onSignIn: () => void }) {
  return <AuthFooterLink lead="Already have an account?" action="Sign in" onClick={onSignIn} />;
}
