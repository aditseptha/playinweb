"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { slugify } from "@/lib/format";
import { isHandle } from "@/lib/host";
import { useAuth } from "@/lib/auth";
import { useGames } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";

type HandleStatus = "idle" | "checking" | "ok" | "taken" | "invalid";

async function handleOwnerId(next: string) {
  const { data } = await createClient().from("profiles").select("id").eq("handle", next).maybeSingle();
  return data?.id ?? null;
}

export function ProfileForm({
  initial,
  onSaved,
}: {
  initial?: Profile | null;
  onSaved?: (profile: Profile) => void;
}) {
  const { user, profile: account, refresh } = useAuth();
  const { saveProfile } = useGames();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const currentHandle = account?.handle ?? initial?.handle ?? "";
  const [handle, setHandle] = useState(currentHandle);
  const [handleStatus, setHandleStatus] = useState<HandleStatus>("idle");

  useEffect(() => {
    const next = handle.trim().toLowerCase();
    if (!next || next === currentHandle) {
      setHandleStatus("idle");
      return;
    }
    if (!isHandle(next)) {
      setHandleStatus("invalid");
      return;
    }
    setHandleStatus("checking");
    const timer = window.setTimeout(() => {
      void handleOwnerId(next).then((id) => {
        setHandleStatus(id && id !== user?.id ? "taken" : "ok");
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [handle, currentHandle, user?.id]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const nextHandle = handle.trim().toLowerCase() || slugify(name);
    const bio = String(fd.get("bio") ?? "").trim();
    if (!name) {
      setError("Display name is required.");
      return;
    }
    if (!isHandle(nextHandle)) {
      setError("Handle must be 3–32 characters: lowercase letters, numbers, and hyphens.");
      return;
    }
    setPending(true);
    setError("");
    if (nextHandle !== currentHandle) {
      const owner = await handleOwnerId(nextHandle);
      if (owner && owner !== user?.id) {
        setPending(false);
        setHandleStatus("taken");
        setError("That handle is already taken.");
        return;
      }
    }
    const profile: Profile = { name, handle: nextHandle, bio };
    saveProfile(profile);
    if (user) {
      const { error: saveError } = await createClient()
        .from("profiles")
        .update({ display_name: name, handle: nextHandle, bio })
        .eq("id", user.id);
      if (saveError) {
        setPending(false);
        setError(saveError.code === "23505" ? "That handle is already taken." : saveError.message);
        if (saveError.code === "23505") setHandleStatus("taken");
        return;
      }
      await refresh();
    }
    setPending(false);
    onSaved?.(profile);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-5">
      <Field label="Display name">
        <TextInput
          name="name"
          required
          defaultValue={account?.display_name || initial?.name || ""}
          placeholder="Ada Chen"
          onChange={(e) => {
            if (!initial?.handle) setHandle(slugify(e.target.value));
          }}
        />
      </Field>
      <Field
        label="Handle"
        hint={
          handleStatus === "checking"
            ? "Checking…"
            : handleStatus === "ok"
              ? "This handle is available."
              : handleStatus === "taken"
                ? "That handle is already taken."
                : handleStatus === "invalid"
                  ? "Use 3–32 lowercase letters, numbers, and hyphens."
                  : "Used in your public channel URL."
        }
      >
        <div className="flex h-10 items-center rounded-lg bg-surface-2 px-3 sm:h-9">
          <span className="text-text-subtle">@</span>
          <TextInput
            name="handle"
            value={handle}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="ada-chen"
            className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent pl-0.5 shadow-none focus:border-transparent focus:bg-transparent focus:ring-0 sm:h-full"
          />
        </div>
      </Field>
      <Field label="Bio">
        <TextArea
          name="bio"
          rows={4}
          defaultValue={account?.bio || initial?.bio || ""}
          placeholder="I make tiny browser games on the train."
        />
      </Field>
      {error ? (
        <p className="text-ui text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          className="w-fit"
          disabled={pending || handleStatus === "taken" || handleStatus === "invalid" || handleStatus === "checking"}
        >
          {pending ? "Saving…" : initial ? "Save profile" : "Create channel"}
        </Button>
        {initial ? (
          <Link href="/profile" className="text-sm text-muted hover:text-text">
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
