"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { useGames } from "@/lib/store";

export function RegisterForm() {
  const { registerGame, profile } = useGames();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const developer = String(fd.get("developer") ?? "").trim();
    const description = String(fd.get("description") ?? "").trim();
    const playUrl = String(fd.get("playUrl") ?? "").trim();
    const thumbnailUrl = String(fd.get("thumbnailUrl") ?? "").trim();
    const tags = String(fd.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);
    const embeddable = fd.get("embeddable") === "on";

    if (!title || !developer || !playUrl) {
      setError("Title, developer, and play URL are required.");
      return;
    }
    if (!isValidPlayUrl(playUrl)) {
      setError("Play URL must start with / or be a valid http(s) link.");
      return;
    }
    if (thumbnailUrl && !isValidHttpUrl(thumbnailUrl) && !thumbnailUrl.startsWith("/")) {
      setError("Thumbnail must be a valid http(s) URL or a local path.");
      return;
    }
    const screenshots = String(fd.get("screenshots") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (screenshots.some((url) => !isValidHttpUrl(url) && !url.startsWith("/"))) {
      setError("Each screenshot must be a valid http(s) URL or a local path.");
      return;
    }

    setPending(true);
    const game = registerGame({
      title,
      developer,
      description: description || `${title} by ${developer}.`,
      playUrl,
      thumbnailUrl,
      screenshots,
      embeddable,
      tags,
    });
    router.push(`/game/${game.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-xl flex-col gap-5">
      <Field label="Title">
        <TextInput name="title" required placeholder="Neon Snake" />
      </Field>
      <Field label="Developer">
        <TextInput name="developer" required placeholder="Your studio" defaultValue={profile?.name} />
      </Field>
      <Field label="Play URL" hint="The page players open. Local games can use a path on this site.">
        <TextInput name="playUrl" required placeholder="https://example.com/play or /games/mine/index.html" />
      </Field>
      <Field label="Description">
        <TextArea name="description" rows={4} placeholder="What should someone feel in the first 30 seconds?" />
      </Field>
      <Field label="Thumbnail URL">
        <TextInput name="thumbnailUrl" placeholder="https://… (optional — we generate one if blank)" />
      </Field>
      <Field label="Screenshot URLs" hint="Optional, comma-separated. Shown as a pager on the game page.">
        <TextInput name="screenshots" placeholder="https://…, /shots/two.png" />
      </Field>
      <Field label="Tags" hint="Comma-separated. Used for related games.">
        <TextInput name="tags" placeholder="arcade, puzzle, original" />
      </Field>
      <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
        <input type="checkbox" name="embeddable" className="h-4 w-4 accent-[var(--accent)]" />
        <span className="text-ui text-text">
          Can be embedded on this site
          <span className="mt-0.5 block text-meta text-text-subtle">
            Uncheck if the game blocks iframes. Players will open a new tab instead.
          </span>
        </span>
      </label>
      {error ? (
        <p className="text-ui text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Publishing…" : "Publish game"}
      </Button>
    </form>
  );
}

function isValidPlayUrl(s: string) {
  if (s.startsWith("/")) return true;
  return isValidHttpUrl(s);
}

function isValidHttpUrl(s: string) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
