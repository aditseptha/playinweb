"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { getRootDomain, isHandle, siteOrigin } from "@/lib/host";
import { slugify } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
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
    router.push("/register");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-md flex-col gap-5">
      <Field label="Display name">
        <TextInput
          name="displayName"
          required
          placeholder="Ada Chen"
          onChange={(e) => {
            if (!handle) setHandle(slugify(e.target.value).slice(0, 32));
          }}
        />
      </Field>
      <Field label="Account URL" hint={`Your page will live at ${handle ? siteOrigin(handle) : siteOrigin("yourname")}`}>
        <div className="flex h-10 items-center overflow-hidden rounded-lg bg-surface-2 sm:h-9">
          <span className="hidden shrink-0 bg-surface-3 px-3 py-2 text-caption text-text-subtle sm:inline">
            {getRootDomain()}/
          </span>
          <TextInput
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="yourname"
            className="h-full min-w-0 flex-1 rounded-none bg-transparent px-3 focus:bg-transparent sm:h-full"
          />
        </div>
      </Field>
      <Field label="Email">
        <TextInput name="email" type="email" required />
      </Field>
      <Field label="Password">
        <TextInput name="password" type="password" required minLength={8} />
      </Field>
      {error ? <p className="text-ui text-danger">{error}</p> : null}
      {notice ? <p className="text-ui text-text-muted">{notice}</p> : null}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </Button>
      <p className="text-ui text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-text hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
