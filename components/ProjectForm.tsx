"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { IconClose } from "@/components/icons";
import { useLoginDialog } from "@/components/LoginDialog";
import { useSignupDialog } from "@/components/SignupDialog";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { slugify } from "@/lib/format";
import { apexOrigin, isSlug, projectPublicUrl } from "@/lib/host";
import { fileExt, MEDIA_BUCKET, publicMediaUrl } from "@/lib/media";
import {
  contentType,
  filesFromHtmlUpload,
  hostedPlayPath,
  flashStoragePrefix,
  htmlBuildSourcePath,
  htmlStoragePrefix,
  MAX_HTML_BYTES,
} from "@/lib/html-game";
import {
  COMMUNITIES,
  GENRES,
  LEGACY_PROJECT_KINDS,
  PROJECT_KINDS,
  RELEASE_STATUSES,
  STORES,
  type Community,
  type ProjectKind,
} from "@/lib/project-fields";
import { clearCatalogueCache, type ProjectRecord } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE = 50 * 1024 * 1024;
const MAX_TAGS = 10;

type HtmlPreview = {
  name: string;
  size: number;
  files: string[];
  error: string;
};

function asKind(value: string | undefined): ProjectKind {
  if (!value) return "html";
  if (PROJECT_KINDS.some((item) => item.id === value)) return value as ProjectKind;
  if (LEGACY_PROJECT_KINDS.includes(value as (typeof LEGACY_PROJECT_KINDS)[number])) return value as ProjectKind;
  return "html";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function saveErrorMessage(err: unknown) {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err && "message" in err && typeof err.message === "string"
        ? err.message
        : "";
  if (!raw) return "Could not save the game.";
  if (raw.includes("projects_kind_check")) {
    return "That game type is not enabled in the database yet. Update projects_kind_check in Supabase to allow this kind.";
  }
  if (raw.includes("html_build_name")) {
    return "Missing html_build_name column. Run: alter table public.projects add column if not exists html_build_name text;";
  }
  return raw;
}

function asCommunity(value: string | undefined): Community {
  return COMMUNITIES.some((item) => item.id === value) ? (value as Community) : "comments";
}

function fieldLabel(title: string, hint: string) {
  return (
    <>
      {title}{" "}
      <span className="font-normal text-text-subtle">({hint})</span>
    </>
  );
}

function sectionLabel(title: string, hint: string) {
  return (
    <p className="text-caption font-medium text-text-muted">
      {title}{" "}
      <span className="font-normal text-text-subtle">({hint})</span>
    </p>
  );
}

function fieldLegend(title: string, hint: string) {
  return (
    <legend className="text-caption font-medium text-text-muted">
      {title}{" "}
      <span className="font-normal text-text-subtle">({hint})</span>
    </legend>
  );
}

export function ProjectForm({ project }: { project?: ProjectRecord }) {
  const editing = Boolean(project);
  const { user, profile, loading } = useAuth();
  const { openLogin } = useLoginDialog();
  const { openSignup } = useSignupDialog();
  const router = useRouter();
  const [title, setTitle] = useState(project?.title ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [kind, setKind] = useState<ProjectKind>(asKind(project?.kind));
  const [allowDonations, setAllowDonations] = useState(project ? project.pricing_type !== "no_payments" : true);
  const [community, setCommunity] = useState<Community>(asCommunity(project?.community));
  const [containsAi, setContainsAi] = useState<"" | "yes" | "no">(
    project ? (project.contains_ai ? "yes" : "no") : "",
  );
  const [tags, setTags] = useState<string[]>((project?.project_tags ?? []).map((t) => t.tag));
  const [tagDraft, setTagDraft] = useState("");
  const [storeUrls, setStoreUrls] = useState<Record<string, string>>(
    Object.fromEntries((project?.project_store_links ?? []).map((l) => [l.store, l.url])),
  );
  const [cover, setCover] = useState<File | null>(null);
  const [shots, setShots] = useState<File[]>([]);
  const [keptShots, setKeptShots] = useState(
    [...(project?.project_screenshots ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [uploads, setUploads] = useState<File[]>([]);
  const [htmlBuild, setHtmlBuild] = useState<File | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<HtmlPreview | null>(null);
  const [flashBuild, setFlashBuild] = useState<File | null>(null);
  const [storedBuildName, setStoredBuildName] = useState(project?.html_build_name ?? "");
  const [playLink, setPlayLink] = useState(
    project?.kind === "external" && project.play_url.startsWith("http") ? project.play_url : "",
  );
  const [visibility, setVisibility] = useState<"public" | "private">(project?.published === false ? "private" : "public");
  const [externalName, setExternalName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [showExternal, setShowExternal] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const previewUrl = useMemo(() => {
    if (!profile || !slug) return "";
    return projectPublicUrl(profile.handle, slug);
  }, [profile, slug]);

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : ""), [cover]);
  const shotPreviews = useMemo(() => shots.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })), [shots]);
  const coverSrc = coverPreview || publicMediaUrl(project?.cover_path);

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  useEffect(() => () => {
    for (const shot of shotPreviews) URL.revokeObjectURL(shot.url);
  }, [shotPreviews]);

  useEffect(() => {
    if (!htmlBuild) {
      setHtmlPreview(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const packed = await filesFromHtmlUpload(htmlBuild.name, await htmlBuild.arrayBuffer());
        if (cancelled) return;
        setHtmlPreview({
          name: htmlBuild.name,
          size: htmlBuild.size,
          files: packed.map((file) => file.path),
          error: "",
        });
      } catch (err) {
        if (!cancelled) {
          setHtmlPreview({
            name: htmlBuild.name,
            size: htmlBuild.size,
            files: [],
            error: err instanceof Error ? err.message : "Could not read this file.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [htmlBuild]);

  useEffect(() => {
    if (!editing || !project || (project.kind !== "html" && project.kind !== "flash")) return;
    if (project.html_build_name) {
      setStoredBuildName(project.html_build_name);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    const prefix =
      project.kind === "flash"
        ? flashStoragePrefix(project.owner_id, project.id)
        : htmlStoragePrefix(project.owner_id, project.id);
    const sourcePath = htmlBuildSourcePath(prefix);
    void supabase.storage
      .from(MEDIA_BUCKET)
      .download(sourcePath)
      .then(async ({ data, error }) => {
        if (cancelled || error || !data) return;
        const name = (await data.text()).trim();
        if (name) setStoredBuildName(name);
      });
    return () => {
      cancelled = true;
    };
  }, [editing, project]);

  const kindOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [...PROJECT_KINDS];
    if (project && LEGACY_PROJECT_KINDS.includes(project.kind as (typeof LEGACY_PROJECT_KINDS)[number])) {
      options.push({ id: project.kind, label: `${project.kind} (legacy)` });
    }
    return options;
  }, [project]);

  if (loading) return <p className="text-ui text-text-muted">Loading account…</p>;

  if (!user || !profile) {
    return (
      <div className="rounded-panel bg-surface-2 px-5 py-10 text-center">
        <p className="text-title font-medium">Create an account first</p>
        <p className="mx-auto mt-1 max-w-md text-ui text-text-muted">
          Games are published on your page, like yourname/game.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button type="button" variant="primary" size="sm" onClick={() => openSignup()}>
            Create account
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => openLogin()}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
    setTags([...tags, tag]);
    setTagDraft("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const nextTitle = title.trim();
    const nextSlug = editing && project ? project.slug : slug.trim();
    if (!nextTitle || !nextSlug) {
      setError("Title and game URL are required.");
      return;
    }
    if (!isSlug(nextSlug)) {
      setError("Game URL must be lowercase letters, numbers, and hyphens.");
      return;
    }
    if (containsAi === "") {
      setError("Please disclose whether this game uses generative AI.");
      return;
    }
    if (kind === "html" && !htmlBuild && !editing) {
      setError("Upload a .zip of the HTML game (with index.html), or a single HTML file.");
      return;
    }
    if (kind === "html" && htmlBuild && htmlBuild.size > MAX_HTML_BYTES) {
      setError("HTML5 game must be 100 MB or smaller.");
      return;
    }
    if (kind === "flash" && !flashBuild && (!editing || !project?.play_url)) {
      setError("Upload a .swf file.");
      return;
    }
    if (kind === "flash" && flashBuild && flashBuild.size > MAX_FILE) {
      setError("Flash game must be 50 MB or smaller.");
      return;
    }
    if (kind === "flash" && flashBuild && !flashBuild.name.toLowerCase().endsWith(".swf")) {
      setError("Flash uploads must be a .swf file.");
      return;
    }
    if (kind === "external") {
      const url = playLink.trim();
      if (!url || !isHttpUrl(url)) {
        setError("Enter a valid http(s) URL where players can play your game.");
        return;
      }
    }

    if (!user || !profile) return;
    setPending(true);
    const supabase = createClient();
    const uid = user.id;
    const handle = profile.handle;

    async function upload(folder: string, file: File) {
      if (file.size > MAX_FILE) throw new Error(`${file.name} is over 50 MB.`);
      const path = `${uid}/${folder}/${crypto.randomUUID()}.${fileExt(file.name)}`;
      const { error: upError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file);
      if (upError) throw upError;
      return path;
    }

    try {
      let coverPath: string | null = project?.cover_path ?? null;
      if (cover) {
        const ok = await minCoverSize(cover, 320, 180);
        if (!ok) throw new Error("Cover must be at least 320×180.");
        coverPath = await upload("covers", cover);
      }

      const shotPaths: string[] = [];
      for (const file of shots) shotPaths.push(await upload("screenshots", file));

      const fileRows: { file_name: string; storage_path: string | null; external_url: string | null; size_bytes: number | null }[] = [];
      for (const file of uploads) {
        const path = await upload("files", file);
        fileRows.push({ file_name: file.name, storage_path: path, external_url: null, size_bytes: file.size });
      }
      if (externalUrl.trim()) {
        fileRows.push({
          file_name: externalName.trim() || "External file",
          storage_path: null,
          external_url: externalUrl.trim(),
          size_bytes: null,
        });
      }

      const fields = {
        title: nextTitle,
        slug: nextSlug,
        tagline: String(fd.get("tagline") ?? "").trim(),
        classification: "game",
        kind,
        release_status: String(fd.get("releaseStatus") ?? "released"),
        pricing_type: allowDonations ? "donate" : "no_payments",
        suggested_donation: null,
        min_price: null,
        cover_path: coverPath,
        trailer_url: String(fd.get("trailerUrl") ?? "").trim() || null,
        description: String(fd.get("description") ?? "").trim(),
        genre: String(fd.get("genre") ?? "") === "No genre" ? null : String(fd.get("genre") ?? "").trim() || null,
        custom_noun: project?.custom_noun || "game",
        community,
        contains_ai: containsAi === "yes",
        embeddable: kind === "html",
        published: visibility === "public",
      };

      let projectId = project?.id ?? "";
      if (editing && project) {
        const { error: updateError } = await supabase.from("projects").update(fields).eq("id", project.id).eq("owner_id", uid);
        if (updateError) throw updateError;
        projectId = project.id;
      } else {
        const { data: created, error: insertError } = await supabase
          .from("projects")
          .insert({
            ...fields,
            owner_id: uid,
            play_url: "",
          })
          .select("id")
          .single();
        if (insertError || !created) throw insertError ?? new Error("Could not create the game.");
        projectId = created.id;
      }

      if (kind === "html" && htmlBuild) {
        const packed = await filesFromHtmlUpload(htmlBuild.name, await htmlBuild.arrayBuffer());
        const prefix = htmlStoragePrefix(uid, projectId);
        for (const file of packed) {
          const copy = new Uint8Array(file.bytes);
          const { error: htmlError } = await supabase.storage.from(MEDIA_BUCKET).upload(
            `${prefix}/${file.path}`,
            new Blob([copy], { type: contentType(file.path) }),
            { contentType: contentType(file.path), upsert: true },
          );
          if (htmlError) throw htmlError;
        }
        const { error: sourceError } = await supabase.storage.from(MEDIA_BUCKET).upload(
          htmlBuildSourcePath(prefix),
          new Blob([htmlBuild.name], { type: "text/plain" }),
          { contentType: "text/plain", upsert: true },
        );
        if (sourceError) throw sourceError;
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: hostedPlayPath(nextSlug) })
          .eq("id", projectId);
        if (playError) throw playError;
        void supabase.from("projects").update({ html_build_name: htmlBuild.name }).eq("id", projectId);
      } else if (kind === "html" && editing && project && nextSlug !== project.slug) {
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: hostedPlayPath(nextSlug) })
          .eq("id", projectId);
        if (playError) throw playError;
      } else if (kind === "flash" && flashBuild) {
        const prefix = flashStoragePrefix(uid, projectId);
        const safeName = flashBuild.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${prefix}/${safeName}`;
        const { error: flashError } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, flashBuild, {
          contentType: "application/x-shockwave-flash",
          upsert: true,
        });
        if (flashError) throw flashError;
        const { error: sourceError } = await supabase.storage.from(MEDIA_BUCKET).upload(
          htmlBuildSourcePath(prefix),
          new Blob([flashBuild.name], { type: "text/plain" }),
          { contentType: "text/plain", upsert: true },
        );
        if (sourceError) throw sourceError;
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: storagePath })
          .eq("id", projectId);
        if (playError) throw playError;
        void supabase.from("projects").update({ html_build_name: flashBuild.name }).eq("id", projectId);
      } else if (kind === "external") {
        const { error: playError } = await supabase
          .from("projects")
          .update({ play_url: playLink.trim() })
          .eq("id", projectId);
        if (playError) throw playError;
      }

      if (editing) {
        const { error: clearTags } = await supabase.from("project_tags").delete().eq("project_id", projectId);
        if (clearTags) throw clearTags;
        const { error: clearLinks } = await supabase.from("project_store_links").delete().eq("project_id", projectId);
        if (clearLinks) throw clearLinks;
      }

      if (tags.length) {
        const { error: tagError } = await supabase.from("project_tags").insert(tags.map((tag) => ({ project_id: projectId, tag })));
        if (tagError) throw tagError;
      }
      const originalPaths = (project?.project_screenshots ?? []).map((shot) => shot.storage_path);
      const keptPaths = keptShots.map((shot) => shot.storage_path);
      const removedPaths = originalPaths.filter((path) => !keptPaths.includes(path));
      if (removedPaths.length) {
        const { error: clearShots } = await supabase
          .from("project_screenshots")
          .delete()
          .eq("project_id", projectId)
          .in("storage_path", removedPaths);
        if (clearShots) throw clearShots;
        const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove(removedPaths);
        if (storageError) throw storageError;
      }
      if (shotPaths.length) {
        const { error: shotError } = await supabase.from("project_screenshots").insert(
          shotPaths.map((storage_path, i) => ({
            project_id: projectId,
            storage_path,
            sort_order: keptShots.length + i,
          })),
        );
        if (shotError) throw shotError;
      }
      if (fileRows.length) {
        const { error: fileError } = await supabase.from("project_files").insert(
          fileRows.map((row) => ({ ...row, project_id: projectId })),
        );
        if (fileError) throw fileError;
      }
      const links = STORES.map((s) => ({ store: s.id, url: storeUrls[s.id]?.trim() ?? "" })).filter((l) => l.url);
      if (links.length) {
        const { error: linkError } = await supabase.from("project_store_links").insert(
          links.map((l) => ({ project_id: projectId, store: l.store, url: l.url })),
        );
        if (linkError) throw linkError;
      }

      clearCatalogueCache();
      router.push(editing ? "/manage" : projectPublicUrl(handle, nextSlug));
      router.refresh();
    } catch (err) {
      setPending(false);
      setError(saveErrorMessage(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Field label="Title">
          <TextInput
            value={title}
            onChange={(e) => {
              const nextTitle = e.target.value;
              setTitle(nextTitle);
              if (!editing && !slugTouched) setSlug(slugify(nextTitle).slice(0, 48));
            }}
            required
          />
        </Field>

        <Field
          label="Game URL"
          hint={
            editing
              ? previewUrl || "This URL is locked after the game is created."
              : previewUrl || "Shown as yourname/game on this site."
          }
        >
          <div className="flex h-10 min-w-0 items-center overflow-hidden rounded-lg bg-surface-2 sm:h-9">
            <span className="hidden max-w-[55%] shrink-0 truncate bg-surface-3 px-3 py-2 text-caption text-text-subtle lg:inline">
              {`${apexOrigin()}/${profile.handle}/`}
            </span>
            <TextInput
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              required
              readOnly={editing}
              disabled={editing}
              className="h-full min-w-0 flex-1 rounded-none bg-transparent px-3 focus:bg-transparent sm:h-full"
            />
          </div>
        </Field>

        <SelectField label="Release status" name="releaseStatus" defaultValue={project?.release_status ?? "released"}>
          {RELEASE_STATUSES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </SelectField>

        <Field label={fieldLabel("Short description or tagline", "Optional. Avoid duplicating your game's title.")}>
          <TextInput name="tagline" placeholder="Optional" defaultValue={project?.tagline ?? ""} />
        </Field>

        <Field label={fieldLabel("Kind of game", "Choose how players access your game.")}>
          <SelectInput value={kind} onChange={(e) => setKind(e.target.value as ProjectKind)}>
            {kindOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </SelectInput>
        </Field>

        {kind === "html" ? (
          <Field
            label="HTML5 game"
            hint={
              editing
                ? "Leave empty to keep the current build. Upload a new .zip to replace it. Max 100 MB."
                : "A .zip with index.html, like itch.io. Max 100 MB. Players run it here — the original host is never shown."
            }
          >
            <input
              type="file"
              accept=".zip,.html,.htm,application/zip"
              className="block w-full text-ui text-text-muted file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:text-body file:text-text"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file && file.size > MAX_HTML_BYTES) {
                  e.target.value = "";
                  setHtmlBuild(null);
                  setHtmlPreview({
                    name: file.name,
                    size: file.size,
                    files: [],
                    error: "HTML5 game must be 100 MB or smaller.",
                  });
                  return;
                }
                setHtmlBuild(file);
              }}
            />
            {htmlPreview ? (
              <HtmlBuildPreview preview={htmlPreview} />
            ) : htmlBuild ? (
              <p className="text-meta text-text-subtle">Selected file: {htmlBuild.name}</p>
            ) : storedBuildName ? (
              <p className="text-meta text-text-subtle">Current file: {storedBuildName}</p>
            ) : editing && project?.play_url ? (
              <p className="text-meta text-text-subtle">
                Current file: Name not saved — re-upload your .zip to show the file name here.
              </p>
            ) : null}
          </Field>
        ) : null}

        {kind === "flash" ? (
          <Field
            label={fieldLabel("Flash game", "Upload a .swf file. Max 50 MB.")}
          >
            <input
              type="file"
              accept=".swf,application/x-shockwave-flash"
              className="block w-full text-ui text-text-muted file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:text-body file:text-text"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file && file.size > MAX_FILE) {
                  e.target.value = "";
                  setFlashBuild(null);
                  setError("Flash game must be 50 MB or smaller.");
                  return;
                }
                setFlashBuild(file);
                setError("");
              }}
            />
            {flashBuild ? (
              <p className="text-meta text-text-subtle">Selected file: {flashBuild.name}</p>
            ) : storedBuildName ? (
              <p className="text-meta text-text-subtle">Current file: {storedBuildName}</p>
            ) : editing && project?.play_url ? (
              <p className="text-meta text-text-subtle">
                Current file: Name not saved — re-upload your .swf to show the file name here.
              </p>
            ) : null}
          </Field>
        ) : null}

        {kind === "external" ? (
          <Field label={fieldLabel("Play URL", "Link to itch.io, Steam, your site, or anywhere players can play.")}>
            <TextInput
              type="url"
              value={playLink}
              onChange={(e) => setPlayLink(e.target.value)}
              placeholder="https://…"
              required
            />
          </Field>
        ) : null}

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-surface-2 px-4 py-3">
          <div className="min-w-0">
            <p className="text-ui font-medium">Allow donations</p>
            <p className="mt-0.5 text-meta text-text-subtle">Let players support your game with a voluntary donation.</p>
          </div>
          <span className="relative inline-flex h-7 w-12 shrink-0">
            <input
              type="checkbox"
              role="switch"
              checked={allowDonations}
              onChange={(e) => setAllowDonations(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full transition-colors duration-200 ease-out-quint",
                "bg-surface-3 peer-checked:bg-brand-blue",
                "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-blue",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-quint",
                "peer-checked:translate-x-5",
              )}
            />
          </span>
        </label>

        <Field label={fieldLabel("Description", "This will make up the content of your game page.")}>
          <TextArea name="description" className="h-[150px] min-h-[150px]" defaultValue={project?.description ?? ""} />
        </Field>

        <SelectField
          label={fieldLabel("Genre", "You can add additional genres with tags.")}
          name="genre"
          defaultValue={project?.genre && GENRES.includes(project.genre as (typeof GENRES)[number]) ? project.genre : "No genre"}
        >
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </SelectField>

        <div>
          {sectionLabel("Tags", "Any other keywords someone might search. Max of 10.")}
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="rounded-lg bg-surface-2 px-3 py-1 text-caption hover:bg-surface-3"
              >
                {tag} ×
              </button>
            ))}
          </div>
          <TextInput
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagDraft);
              }
            }}
            placeholder="Click to view options, type to filter or enter custom tag"
            className="mt-2"
          />
        </div>

        <fieldset>
          {fieldLegend("Generative AI disclosure", "Does this game contain output from generative AI tools?")}
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="ai" checked={containsAi === "yes"} onChange={() => setContainsAi("yes")} />
            Yes — This game contains the output of Generative AI
          </label>
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="ai" checked={containsAi === "no"} onChange={() => setContainsAi("no")} />
            No — This game does not contain the output of Generative AI
          </label>
        </fieldset>

        <div>
          {sectionLabel("App store links", "These will be linked to on the game page.")}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {STORES.map((store) => (
              <TextInput
                key={store.id}
                value={storeUrls[store.id] ?? ""}
                onChange={(e) => setStoreUrls({ ...storeUrls, [store.id]: e.target.value })}
                placeholder={`+ ${store.label}`}
              />
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="text-caption font-medium text-text-muted">Community</legend>
          {COMMUNITIES.map((item) => (
            <label key={item.id} className="mt-2 flex items-start gap-2 text-ui">
              <input type="radio" name="community" checked={community === item.id} onChange={() => setCommunity(item.id)} />
              {item.label}
            </label>
          ))}
        </fieldset>

        <fieldset>
          {fieldLegend(
            "Visibility",
            visibility === "private"
              ? "Only you can open this listing. It stays off the catalogue and your public page."
              : "Anyone can find and play this listing.",
          )}
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="visibility" checked={visibility === "public"} onChange={() => setVisibility("public")} />
            Public
          </label>
          <label className="mt-2 flex items-start gap-2 text-ui">
            <input type="radio" name="visibility" checked={visibility === "private"} onChange={() => setVisibility("private")} />
            Private
          </label>
        </fieldset>

        {error ? <p className="text-ui text-danger">{error}</p> : null}

        <Button type="submit" variant="primary" disabled={pending} className="w-fit">
          {pending ? "Saving…" : editing ? "Save changes" : "Save & view page"}
        </Button>
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
        <div>
          <p className="text-caption font-medium text-text-muted">Cover image</p>
          <label className="relative mt-2 grid aspect-video cursor-pointer place-items-center overflow-hidden rounded-panel bg-bg-inset text-center text-ui text-text-muted">
            {coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <span
              className={cn(
                "relative z-10 rounded-md px-2 py-1",
                coverSrc ? "bg-black/60 text-white" : "",
              )}
            >
              {cover ? "Replace cover image" : project?.cover_path ? "Replace cover image" : "Upload cover image"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-2 text-meta text-text-subtle">Required for best results. 16:9, minimum 320×180, recommended 1280×720.</p>
        </div>
        <Field label="Gameplay video or trailer" hint="YouTube or Vimeo">
          <TextInput name="trailerUrl" placeholder="https://www.youtube.com/watch?v=…" defaultValue={project?.trailer_url ?? ""} />
        </Field>
        <div>
          <p className="text-caption font-medium text-text-muted">Screenshots</p>
          <label className="mt-2 inline-flex h-10 cursor-pointer items-center rounded-lg bg-surface-2 px-3.5 text-body sm:h-9">
            Add screenshots
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const next = [...(e.target.files ?? [])];
                if (next.length) setShots((cur) => [...cur, ...next]);
                e.target.value = "";
              }}
            />
          </label>
          <p className="mt-2 text-meta text-text-subtle">Upload 3 to 5 for best results.</p>
          {keptShots.length || shotPreviews.length ? (
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {keptShots.map((shot) => (
                <li key={shot.storage_path} className="relative aspect-video overflow-hidden rounded-lg bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicMediaUrl(shot.storage_path)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <RemoveShotButton
                    label="Remove screenshot"
                    onClick={() => setKeptShots((cur) => cur.filter((item) => item.storage_path !== shot.storage_path))}
                  />
                </li>
              ))}
              {shotPreviews.map((shot, i) => (
                <li key={shot.url} className="relative aspect-video overflow-hidden rounded-lg bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <RemoveShotButton
                    label="Remove screenshot"
                    onClick={() => setShots((cur) => cur.filter((_, index) => index !== i))}
                  />
                </li>
              ))}
            </ul>
          ) : null}
          {shotPreviews.length && keptShots.length ? (
            <p className="mt-2 text-meta text-text-subtle">
              {keptShots.length} uploaded, {shotPreviews.length} new ready to save
            </p>
          ) : shotPreviews.length ? (
            <p className="mt-2 text-meta text-text-subtle">{shotPreviews.length} new screenshot{shotPreviews.length === 1 ? "" : "s"} ready to save</p>
          ) : keptShots.length ? (
            <p className="mt-2 text-meta text-text-subtle">{keptShots.length} already uploaded</p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}

function RemoveShotButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute right-1.5 top-1.5 z-10 grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
    >
      <IconClose className="h-3.5 w-3.5" />
    </button>
  );
}

function HtmlBuildPreview({ preview }: { preview: HtmlPreview }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg bg-bg-inset">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
        <p className="min-w-0 truncate text-ui font-medium">{preview.name}</p>
        <p className="text-meta text-text-subtle">{formatSize(preview.size)}</p>
      </div>
      {preview.error ? (
        <p className="px-3 pb-3 text-ui text-danger">{preview.error}</p>
      ) : (
        <>
          <p className="px-3 text-meta text-text-subtle">
            {preview.files.length} file{preview.files.length === 1 ? "" : "s"}
          </p>
          <ul className="max-h-32 overflow-y-auto px-3 pb-3 text-meta text-text-subtle">
            {preview.files.slice(0, 20).map((path) => (
              <li key={path} className="truncate">
                {path}
              </li>
            ))}
            {preview.files.length > 20 ? <li>+{preview.files.length - 20} more</li> : null}
          </ul>
        </>
      )}
    </div>
  );
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: React.ReactNode;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <Field label={label}>
      <SelectInput name={name} defaultValue={defaultValue}>
        {children}
      </SelectInput>
    </Field>
  );
}

function minCoverSize(file: File, minW: number, minH: number) {
  return new Promise<boolean>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.width >= minW && img.height >= minH);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}
