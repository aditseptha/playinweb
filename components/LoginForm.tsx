"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { continueAfterAuth } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    setPending(true);
    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signInWithPassword({ email, password });
    if (signError) {
      setPending(false);
      setError(signError.message);
      return;
    }
    continueAfterAuth(data.session, params.get("next"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-md flex-col gap-5">
      <Field label="Email">
        <TextInput name="email" type="email" required />
      </Field>
      <Field label="Password">
        <TextInput name="password" type="password" required />
      </Field>
      {error ? <p className="text-ui text-danger">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-ui text-text-muted">
        Need an account?{" "}
        <Link href="/signup" className="text-text hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
